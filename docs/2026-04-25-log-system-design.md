# 日志系统设计文档

## 概述

为闲鱼客服自动化工具添加日志查看功能，让主进程（src/main/）的日志实时展示在渲染进程的专用页面中。

## 设计目标

1. **实时性**：主进程日志产生后立即推送到渲染进程
2. **内存缓冲**：渲染进程维护最近 1000 条日志，不持久化
3. **功能完整**：支持过滤（级别/模块）、自动滚动、颜色区分
4. **低侵入**：不改变现有 logger 调用方式

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                          主进程 (Node.js)                        │
│                                                                 │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │   consola   │───▶│ LogCollector    │───▶│ IPC 推送        │  │
│  │  (现有logger)│    │ (自定义Reporter) │    │ webContents.send│  │
│  └─────────────┘    └─────────────────┘    └────────┬────────┘  │
│                                                     │           │
└─────────────────────────────────────────────────────┼───────────┘
                                                      │
                                                      │ log:new
                                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        渲染进程 (React)                          │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │ IPC 监听        │───▶│ LogStore        │───▶│ LogsPage    │  │
│  │ ipcRenderer.on  │    │ (内存缓冲1000条) │    │ (UI 展示)   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 核心组件

| 组件 | 位置 | 职责 |
|------|------|------|
| `LogCollector` | `src/main/log/` | 自定义 consola reporter，收集日志并推送 |
| `LogStore` | 渲染进程 hook | 渲染进程内存缓冲，管理日志状态 |
| `LogsPage` | `src/renderer/src/pages/` | 日志展示页面 UI |
| `log:stream` | IPC 通道 | 日志数据传输通道 |

## 数据设计

### 日志数据结构

```typescript
// src/shared/types.ts 中新增

/** 单条日志记录 */
export interface LogEntry {
  /** 唯一 ID（时间戳 + 随机数） */
  id: string
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  /** 模块标签（如 'browser', 'agent'） */
  tag: string
  /** 日志消息 */
  message: string
  /** 附加数据（可选） */
  args?: unknown[]
  /** 时间戳（毫秒） */
  timestamp: number
}
```

### IPC 通道设计

| 通道名 | 方向 | 数据类型 | 说明 |
|--------|------|----------|------|
| `log:new` | 主→渲染 | `LogEntry` | 新日志条目推送 |
| `log:request` | 渲染→主 | `void` | 请求历史日志（页面打开时） |
| `log:history` | 主→渲染 | `LogEntry[]` | 返回内存中的历史日志 |

## 组件详细设计

### 1. LogCollector（主进程）

位置：`src/main/log/log-collector.ts`

```typescript
import { consola } from 'consola'
import type { BrowserWindow } from 'electron'
import type { LogEntry } from '../../shared/types'

class LogCollector {
  private win: BrowserWindow | null = null
  private buffer: LogEntry[] = []
  private readonly maxSize = 1000

  /** 设置目标窗口 */
  setWindow(win: BrowserWindow): void {
    this.win = win
  }

  /** consola reporter 接口 */
  report(logObj: any): void {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level: logObj.level,
      tag: logObj.tag || 'default',
      message: logObj.args?.join(' ') || '',
      args: logObj.args,
      timestamp: logObj.date?.getTime() || Date.now()
    }

    // 添加到缓冲区
    this.buffer.push(entry)
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift()
    }

    // 推送到渲染进程
    this.win?.webContents.send('log:new', entry)
  }

  /** 获取历史日志 */
  getHistory(): LogEntry[] {
    return [...this.buffer]
  }
}

export const logCollector = new LogCollector()
```

### 2. LogStore（渲染进程）

位置：`src/renderer/src/pages/logs-page-model.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { LogEntry } from '../../../shared/types'

const MAX_LOGS = 1000

export function useLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [levelFilter, setLevelFilter] = useState<Set<string>>(
    new Set(['debug', 'info', 'warn', 'error', 'fatal'])
  )
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set())

  // 添加日志条目
  const addEntry = useCallback((entry: LogEntry) => {
    setLogs(prev => {
      const next = [...prev, entry]
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next
    })
  }, [])

  // 清空日志
  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // 过滤后的日志
  const filteredLogs = logs.filter(log => {
    if (!levelFilter.has(log.level)) return false
    if (tagFilter.size > 0 && !tagFilter.has(log.tag)) return false
    return true
  })

  // 获取所有出现过的标签
  const availableTags = Array.from(new Set(logs.map(l => l.tag))).sort()

  // 监听 IPC
  useEffect(() => {
    const cleanup = window.electron.log.onNew(addEntry)
    window.electron.log.getHistory().then(setLogs)
    return cleanup
  }, [addEntry])

  return {
    logs: filteredLogs,
    allLogs: logs,
    levelFilter,
    tagFilter,
    availableTags,
    setLevelFilter,
    setTagFilter,
    clearLogs
  }
}
```

### 3. LogsPage（渲染进程）

位置：`src/renderer/src/pages/LogsPage.tsx`

页面结构：
- 顶部工具栏：级别过滤（复选框）、模块过滤（下拉）、清空按钮
- 日志列表：显示时间、级别、标签、消息
- 自动滚动：新日志到来时自动滚动到底部

## UI 设计

### 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  日志                                            [清空]      │
├─────────────────────────────────────────────────────────────┤
│  级别: [✓ Debug] [✓ Info] [✓ Warn] [✓ Error]               │
│  模块: [All ▼]                                              │
├─────────────────────────────────────────────────────────────┤
│  14:32:15 [INFO]  [browser] 窗口已创建                       │
│  14:32:16 [INFO]  [agent] 开始处理消息                       │
│  14:32:16 [WARN]  [agent-runner] API 响应较慢                │
│  14:32:17 [ERROR] [ipc:safe-handle] 未捕获异常: ...          │
│  ...                                                        │
│  ───────────────── 自动滚动 ─────────────────               │
└─────────────────────────────────────────────────────────────┘
```

### 颜色方案

| 级别 | 颜色 | CSS 变量 |
|------|------|----------|
| debug | 灰色 | `--text-secondary` |
| info | 蓝色 | `--color-info` |
| warn | 黄色 | `--color-warning` |
| error | 红色 | `--color-danger` |
| fatal | 深红 | `--color-danger` + 加粗 |

## 实现清单

### 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/main/log/log-collector.ts` | 日志收集器（自定义 reporter） |
| `src/main/log/index.ts` | 导出入口 |
| `src/main/ipc/log-handlers.ts` | IPC handler 注册 |
| `src/renderer/src/pages/LogsPage.tsx` | 日志页面组件 |
| `src/renderer/src/pages/logs-page-model.ts` | 页面逻辑 hook |
| `src/renderer/src/pages/styles/logs-page.css` | 页面样式 |

### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/shared/types.ts` | 新增 `LogEntry` 类型 |
| `src/preload/index.ts` | 新增 `log` API |
| `src/renderer/src/routes/route-meta.json` | 新增 `/logs` 路由 |
| `src/renderer/src/routes/route-components.tsx` | 新增路由映射 |
| `src/main/index.ts` | 初始化 LogCollector |

## 依赖关系

```
log-collector.ts (新建)
       │
       ▼
log-handlers.ts (新建) ──▶ ipc-handlers.ts (修改)
       │
       ▼
   index.ts (修改) ──▶ 创建窗口时初始化 LogCollector
```

## 测试策略

1. **单元测试**：LogCollector 的缓冲区逻辑
2. **集成测试**：IPC 通道通信
3. **手动测试**：UI 交互和实时更新

## 未来扩展

- 日志搜索功能（当前未实现，YAGNI）
- 日志导出功能
- 日志持久化存储（可选）
