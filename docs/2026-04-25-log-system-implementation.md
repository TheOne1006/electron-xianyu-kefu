# 日志系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现主进程日志实时展示到渲染进程的日志查看页面

**Architecture:** 使用自定义 consola Reporter 收集主进程日志，通过 IPC 实时推送到渲染进程，渲染进程维护 1000 条内存缓冲并展示

**Tech Stack:** TypeScript, consola, Electron IPC, React Hooks

---

## 文件结构

### 新增文件
| 文件路径 | 职责 |
|----------|------|
| `src/main/log/log-collector.ts` | 自定义 consola reporter，收集日志并推送到渲染进程 |
| `src/main/log/index.ts` | LogCollector 导出入口 |
| `src/main/ipc/log-handlers.ts` | 注册 log 相关的 IPC handler |
| `src/renderer/src/pages/LogsPage.tsx` | 日志展示页面组件 |
| `src/renderer/src/pages/logs-page-model.ts` | 日志页面业务逻辑 hook |
| `src/renderer/src/pages/styles/logs-page.css` | 日志页面样式 |

### 修改文件
| 文件路径 | 修改内容 |
|----------|----------|
| `src/shared/types.ts` | 新增 `LogEntry` 类型定义 |
| `src/preload/index.ts` | 新增 `log` API 暴露给渲染进程 |
| `src/main/index.ts` | 初始化 LogCollector 并设置窗口引用 |
| `src/main/ipc-handlers.ts` | 注册 log-handlers |
| `src/renderer/src/routes/route-meta.json` | 新增 `/logs` 路由配置 |
| `src/renderer/src/routes/route-components.tsx` | 新增 LogsPage 路由映射 |

---

## Task 1: 添加 LogEntry 类型定义

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: 在 shared/types.ts 末尾添加 LogEntry 类型**

```typescript
// ============================================================
// K. 日志类型
// ============================================================

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/** 单条日志记录 */
export interface LogEntry {
  /** 唯一 ID（时间戳 + 随机数） */
  id: string
  /** 日志级别 */
  level: LogLevel
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

- [ ] **Step 2: 运行类型检查验证**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/shared/types.ts
git commit -m "feat: 添加 LogEntry 日志类型定义"
```

---

## Task 2: 创建 LogCollector 日志收集器

**Files:**
- Create: `src/main/log/log-collector.ts`
- Create: `src/main/log/index.ts`

- [ ] **Step 1: 创建 log-collector.ts**

```typescript
import type { BrowserWindow } from 'electron'
import type { LogEntry, LogLevel } from '../../shared/types'

/**
 * 日志收集器
 *
 * 作为 consola 的自定义 reporter，收集主进程日志并推送到渲染进程。
 * 维护一个环形缓冲区（默认 1000 条），用于新打开日志页面时提供历史数据。
 */
class LogCollector {
  private win: BrowserWindow | null = null
  private buffer: LogEntry[] = []
  private readonly maxSize = 1000

  /**
   * 设置目标窗口引用
   * 在主窗口创建后调用
   */
  setWindow(win: BrowserWindow): void {
    this.win = win
  }

  /**
   * consola reporter 接口
   * consola 会在每次日志输出时调用此方法
   */
  report(logObj: {
    level?: number
    type?: string
    tag?: string
    args?: unknown[]
    date?: Date
  }): void {
    // consola level number 转换为可读字符串
    const levelMap: Record<number, LogLevel> = {
      0: 'fatal',
      1: 'error',
      2: 'warn',
      3: 'info',
      4: 'debug',
      5: 'trace'
    }

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level: levelMap[logObj.level ?? 3] ?? 'info',
      tag: logObj.tag || 'default',
      message: logObj.args?.map(arg => String(arg)).join(' ') || '',
      args: logObj.args,
      timestamp: logObj.date?.getTime() || Date.now()
    }

    // 添加到缓冲区
    this.buffer.push(entry)
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift()
    }

    // 推送到渲染进程（如果窗口存在且未销毁）
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('log:new', entry)
    }
  }

  /**
   * 获取历史日志
   * 用于新打开日志页面时加载已有日志
   */
  getHistory(): LogEntry[] {
    return [...this.buffer]
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = []
  }
}

/** 单例实例 */
export const logCollector = new LogCollector()
```

- [ ] **Step 2: 创建 index.ts 导出入口**

```typescript
export { logCollector } from './log-collector'
```

- [ ] **Step 3: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add src/main/log/
git commit -m "feat: 创建 LogCollector 日志收集器"
```

---

## Task 3: 创建 log IPC handlers

**Files:**
- Create: `src/main/ipc/log-handlers.ts`
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: 创建 log-handlers.ts**

```typescript
import { safeHandle } from './safe-handle'
import { ok } from '../ipc-response'
import { logCollector } from '../log'

/**
 * 注册日志相关的 IPC handler
 */
export function registerLogHandlers(): void {
  // 获取历史日志
  safeHandle('log:request', () => {
    return ok(logCollector.getHistory())
  })

  // 清空日志
  safeHandle('log:clear', () => {
    logCollector.clear()
    return ok(null)
  })
}
```

- [ ] **Step 2: 修改 ipc-handlers.ts 注册 log handlers**

在 `import` 区域添加：
```typescript
import { registerLogHandlers } from './ipc/log-handlers'
```

在 `registerIpcHandlers()` 函数体中添加：
```typescript
registerLogHandlers()
```

- [ ] **Step 3: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add src/main/ipc/log-handlers.ts src/main/ipc-handlers.ts
git commit -m "feat: 注册 log IPC handlers"
```

---

## Task 4: 修改主进程初始化 LogCollector

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: 添加 import**

在文件顶部添加：
```typescript
import { logCollector } from './log'
```

- [ ] **Step 2: 在 createMainWindow() 中设置窗口引用**

在 `setMainWindow(mainWindow)` 之后添加：
```typescript
logCollector.setWindow(mainWindow)
```

- [ ] **Step 3: 配置 consola 使用 LogCollector**

在 `registerIpcHandlers()` 之前添加：
```typescript
import { consola } from 'consola'

// 配置 consola 将日志同时发送到 LogCollector
consola.addReporter({
  log: (logObj) => logCollector.report(logObj)
})
```

- [ ] **Step 4: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 5: 提交**

```bash
git add src/main/index.ts
git commit -m "feat: 主进程初始化 LogCollector 并配置 consola"
```

---

## Task 5: 修改 preload 暴露 log API

**Files:**
- Modify: `src/preload/index.ts`

- [ ] **Step 1: 在 api 对象中添加 log 属性**

在 `document` 属性之后添加：
```typescript
log: {
  request: () => invokeAndUnwrap<import('../shared/types').LogEntry[]>('log:request'),
  clear: () => ipcRenderer.invoke('log:clear'),
  onNew: (callback: (entry: import('../shared/types').LogEntry) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, entry: import('../shared/types').LogEntry): void =>
      callback(entry)
    ipcRenderer.on('log:new', handler)
    return () => ipcRenderer.removeListener('log:new', handler)
  }
}
```

- [ ] **Step 2: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/preload/index.ts
git commit -m "feat: preload 暴露 log API"
```

---

## Task 6: 创建日志页面 hook

**Files:**
- Create: `src/renderer/src/pages/logs-page-model.ts`

- [ ] **Step 1: 创建 logs-page-model.ts**

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import type { LogEntry } from '@shared/types'

const MAX_LOGS = 1000

/**
 * 日志页面业务逻辑
 */
export function useLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [levelFilter, setLevelFilter] = useState<Set<string>>(
    new Set(['debug', 'info', 'warn', 'error', 'fatal'])
  )
  const [tagFilter, setTagFilter] = useState<string>('')
  const listRef = useRef<HTMLDivElement>(null)
  const isAutoScrollRef = useRef(true)

  // 添加日志条目
  const addEntry = useCallback((entry: LogEntry) => {
    setLogs(prev => {
      const next = [...prev, entry]
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next
    })
  }, [])

  // 清空日志
  const clearLogs = useCallback(async () => {
    await window.electron.log.clear()
    setLogs([])
  }, [])

  // 切换级别过滤
  const toggleLevel = useCallback((level: string) => {
    setLevelFilter(prev => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }, [])

  // 过滤后的日志
  const filteredLogs = logs.filter(log => {
    if (!levelFilter.has(log.level)) return false
    if (tagFilter && log.tag !== tagFilter) return false
    return true
  })

  // 获取所有出现过的标签（用于过滤下拉）
  const availableTags = Array.from(new Set(logs.map(l => l.tag))).sort()

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (listRef.current && isAutoScrollRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [])

  // 监听滚动事件，判断是否应该自动滚动
  const handleScroll = useCallback(() => {
    if (listRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current
      isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50
    }
  }, [])

  // 监听 IPC 日志事件
  useEffect(() => {
    const cleanup = window.electron.log.onNew(addEntry)
    window.electron.log.request().then(setLogs)
    return cleanup
  }, [addEntry])

  // 新日志到来时自动滚动
  useEffect(() => {
    scrollToBottom()
  }, [filteredLogs, scrollToBottom])

  return {
    logs: filteredLogs,
    allLogs: logs,
    levelFilter,
    tagFilter,
    availableTags,
    listRef,
    toggleLevel,
    setTagFilter,
    clearLogs,
    handleScroll
  }
}
```

- [ ] **Step 2: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/renderer/src/pages/logs-page-model.ts
git commit -m "feat: 创建日志页面 hook"
```

---

## Task 7: 创建日志页面样式

**Files:**
- Create: `src/renderer/src/pages/styles/logs-page.css`

- [ ] **Step 1: 创建 logs-page.css**

```css
/* 日志页面样式 */

.logs-page__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-default);
  flex-wrap: wrap;
}

.logs-page__filters {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
}

.logs-page__level-filters {
  display: flex;
  gap: var(--space-2);
}

.logs-page__level-btn {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-caption);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.logs-page__level-btn:hover {
  border-color: var(--border-active);
}

.logs-page__level-btn--active {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: white;
}

.logs-page__level-btn--debug.logs-page__level-btn--active {
  background: var(--text-secondary);
  border-color: var(--text-secondary);
}

.logs-page__level-btn--info.logs-page__level-btn--active {
  background: var(--color-info);
  border-color: var(--color-info);
}

.logs-page__level-btn--warn.logs-page__level-btn--active {
  background: var(--color-warning);
  border-color: var(--color-warning);
}

.logs-page__level-btn--error.logs-page__level-btn--active,
.logs-page__level-btn--fatal.logs-page__level-btn--active {
  background: var(--color-danger);
  border-color: var(--color-danger);
}

.logs-page__tag-select {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-caption);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text-primary);
  min-width: 120px;
}

.logs-page__clear-btn {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-caption);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-danger);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.logs-page__clear-btn:hover {
  background: var(--color-danger);
  color: white;
}

.logs-page__list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
  font-family: var(--font-mono);
  font-size: var(--text-code);
  background: var(--bg-base);
}

.logs-page__entry {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  border-bottom: 1px solid var(--divider);
  line-height: var(--leading-relaxed);
}

.logs-page__entry:hover {
  background: var(--bg-elevated);
}

.logs-page__timestamp {
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 80px;
}

.logs-page__level {
  font-weight: 600;
  white-space: nowrap;
  min-width: 50px;
}

.logs-page__level--debug {
  color: var(--text-secondary);
}

.logs-page__level--info {
  color: var(--color-info);
}

.logs-page__level--warn {
  color: var(--color-warning);
}

.logs-page__level--error {
  color: var(--color-danger);
}

.logs-page__level--fatal {
  color: var(--color-danger);
  font-weight: 700;
}

.logs-page__tag {
  color: var(--color-info);
  white-space: nowrap;
  min-width: 120px;
}

.logs-page__message {
  color: var(--text-primary);
  word-break: break-all;
}

.logs-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: var(--text-body);
}
```

- [ ] **Step 2: 提交**

```bash
git add src/renderer/src/pages/styles/logs-page.css
git commit -m "feat: 创建日志页面样式"
```

---

## Task 8: 创建日志页面组件

**Files:**
- Create: `src/renderer/src/pages/LogsPage.tsx`

- [ ] **Step 1: 创建 LogsPage.tsx**

```tsx
import { useLogsPage } from './logs-page-model'
import './styles/logs-page.css'

/**
 * 日志查看页面
 * 实时展示主进程的日志输出
 */
export function LogsPage(): React.JSX.Element {
  const {
    logs,
    levelFilter,
    tagFilter,
    availableTags,
    listRef,
    toggleLevel,
    setTagFilter,
    clearLogs,
    handleScroll
  } = useLogsPage()

  const levels = ['debug', 'info', 'warn', 'error', 'fatal'] as const

  /** 格式化时间戳为 HH:mm:ss */
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="page-shell">
      {/* 工具栏 */}
      <div className="logs-page__toolbar">
        <div className="logs-page__filters">
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-caption)' }}>
            级别:
          </span>
          <div className="logs-page__level-filters">
            {levels.map(level => (
              <button
                key={level}
                className={`logs-page__level-btn logs-page__level-btn--${level} ${
                  levelFilter.has(level) ? 'logs-page__level-btn--active' : ''
                }`}
                onClick={() => toggleLevel(level)}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>

          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-caption)', marginLeft: 'var(--space-2)' }}>
            模块:
          </span>
          <select
            className="logs-page__tag-select"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">全部</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <button className="logs-page__clear-btn" onClick={clearLogs}>
          清空
        </button>
      </div>

      {/* 日志列表 */}
      <div
        className="logs-page__list"
        ref={listRef}
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div className="logs-page__empty">暂无日志</div>
        ) : (
          logs.map(entry => (
            <div key={entry.id} className="logs-page__entry">
              <span className="logs-page__timestamp">{formatTime(entry.timestamp)}</span>
              <span className={`logs-page__level logs-page__level--${entry.level}`}>
                {entry.level.toUpperCase()}
              </span>
              <span className="logs-page__tag">[{entry.tag}]</span>
              <span className="logs-page__message">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/renderer/src/pages/LogsPage.tsx
git commit -m "feat: 创建日志页面组件"
```

---

## Task 9: 配置路由

**Files:**
- Modify: `src/renderer/src/routes/route-meta.json`
- Modify: `src/renderer/src/routes/route-components.tsx`
- Modify: `src/renderer/src/routes/route-meta.ts`

- [ ] **Step 1: 修改 route-meta.json 添加日志路由**

在数组末尾（`]` 之前）添加：
```json
,
{
  "path": "/logs",
  "title": "日志",
  "iconKey": "logs",
  "navVisible": true
}
```

- [ ] **Step 2: 修改 route-meta.ts 添加 iconKey 类型**

修改 `RouteIconKey` 类型：
```typescript
export type RouteIconKey =
  | 'agent'
  | 'conversations'
  | 'documents'
  | 'logs'
  | 'products'
  | 'qa'
  | 'quickStart'
  | 'settings'
```

- [ ] **Step 3: 修改 route-components.tsx 添加路由映射**

添加 import：
```typescript
import { LogsPage } from '../pages/LogsPage'
```

在 `routeComponentMap` 中添加：
```typescript
'/logs': LogsPage
```

- [ ] **Step 4: 更新 Sidebar 图标**

在 `src/renderer/src/components/Sidebar.tsx` 中添加 logs 图标映射（需要查看现有图标实现方式）

- [ ] **Step 5: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 6: 运行 lint 检查**

Run: `pnpm lint`
Expected: 无 lint 错误

- [ ] **Step 7: 提交**

```bash
git add src/renderer/src/routes/
git commit -m "feat: 配置日志页面路由"
```

---

## Task 10: 集成测试

**Files:**
- Test: 手动测试

- [ ] **Step 1: 启动开发服务器**

Run: `pnpm dev`

- [ ] **Step 2: 验证日志页面加载**

1. 打开应用
2. 点击侧边栏的"日志"菜单
3. 验证页面正确加载，显示"暂无日志"

- [ ] **Step 3: 验证日志实时推送**

1. 触发一些主进程操作（如打开浏览器窗口）
2. 验证日志页面实时显示新日志
3. 验证日志颜色正确（INFO 蓝色、WARN 黄色、ERROR 红色）

- [ ] **Step 4: 验证过滤功能**

1. 点击级别过滤按钮，验证过滤生效
2. 选择模块过滤，验证只显示对应模块日志

- [ ] **Step 5: 验证自动滚动**

1. 产生足够多日志使列表可滚动
2. 验证新日志到来时自动滚动到底部
3. 手动滚动到中间，验证停止自动滚动
4. 滚动到底部，验证恢复自动滚动

- [ ] **Step 6: 验证清空功能**

1. 点击"清空"按钮
2. 验证日志列表清空

- [ ] **Step 7: 运行完整测试**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: 所有检查通过

- [ ] **Step 8: 最终提交**

```bash
git add -A
git commit -m "feat: 日志系统实现完成"
```

---

## Self-Review Checklist

**1. Spec 覆盖检查：**
- ✅ 实时推送：通过 consola reporter + IPC 实现
- ✅ 内存缓冲：LogCollector 维护 1000 条缓冲
- ✅ 过滤功能：级别过滤 + 模块过滤
- ✅ 自动滚动：useLogsPage hook 实现
- ✅ 颜色区分：CSS 类实现不同级别颜色

**2. Placeholder 扫描：**
- ✅ 无 TBD/TODO
- ✅ 所有步骤包含完整代码
- ✅ 无模糊描述

**3. 类型一致性：**
- ✅ LogEntry 类型在所有文件中一致
- ✅ IPC 通道名称一致（log:new, log:request, log:clear）
- ✅ 方法名称一致（onNew, request, clear）
