# 日志系统

## 概述

统一的日志收集、存储和查看方案。所有进程（主进程、渲染进程、注入脚本）的日志通过 IPC reporter 汇聚到主进程，写入按日期分割的日志文件，并可在 UI 中实时查看。

## 架构

```text
┌─────────────┐    IPC send     ┌──────────────┐
│  渲染进程     │ ──────────────►│              │
│  (consola)   │                │  LogCollector │ ──► LogFileWriter ──► ~/.electron-xianyu-kefu/logs/app-YYYY-MM-DD.log
└─────────────┘                │  (主进程)     │
┌─────────────┐    IPC send     │              │
│  注入脚本     │ ──────────────►│              │
│  (consola)   │                └──────────────┘
└─────────────┘
```

## 核心模块

| 文件                                   | 说明                                         |
| -------------------------------------- | -------------------------------------------- |
| `src/shared/log-reporter.ts`           | 共享 IPC log reporter，通过 `ipcRenderer.send` 发送日志 |
| `src/main/log/log-collector.ts`        | 主进程 LogCollector，接收 IPC 日志并分发给 writer 和 UI |
| `src/main/log/file-writer.ts`          | LogFileWriter，按日期自动轮转写入日志文件    |
| `src/main/setup-consola.ts`            | 主进程 consola 配置，注册 LogCollector       |
| `src/main/ipc/log-handlers.ts`         | IPC handler：`log:request`、`log:clear`、`log:history`、`log:listDates` |
| `src/preload/index.ts`                 | preload 桥接：`log.request`、`log.clear`、`log.onNew`、`log.history`、`log.listDates` |
| `src/renderer/src/pages/LogsPage.tsx`  | 日志查看页面，支持按日期查看历史日志         |

## 日志格式

```
[HH:mm:ss] [LEVEL] [tag] message
```

示例：
```
[14:30:05] [INFO ] [ipc:core] 应用配置已保存
[14:30:06] [WARN ] [payment-handler] 商品不存在: 12345
```

## IPC 通道

| 通道              | 方向           | 说明                               |
| ----------------- | -------------- | ---------------------------------- |
| `log:push`        | renderer→main  | 渲染进程/注入脚本推送日志条目      |
| `log:request`     | renderer→main  | 获取当前内存中的日志条目           |
| `log:clear`       | renderer→main  | 清空内存日志                       |
| `log:history`     | renderer→main  | 按日期读取历史日志文件             |
| `log:listDates`   | renderer→main  | 列出所有有日志文件的日期           |
| `log:new`         | main→renderer  | 主动推送新日志条目到渲染进程       |

## 日志文件存储

- 路径：`~/.electron-xianyu-kefu/logs/`
- 文件命名：`app-YYYY-MM-DD.log`
- 按日期自动轮转，当天所有日志追加到同一文件
