# 数据管理

## 概述

提供应用数据的导出、导入功能，以及统一的 store 数据目录管理。用户可一键备份全部配置和数据，也可从备份文件恢复。

## 统一 Store 目录

所有 electron-store 实例统一存储在 `{userData}/app-data/` 目录下，避免与 Electron 内部文件混杂。

| Store              | 文件名                | 说明                       |
| ------------------ | --------------------- | -------------------------- |
| app-config-store   | app-config.json       | 应用配置（LLM、浏览器等）  |
| agent-config-store | agent-config.json     | 5 个 Agent 的配置          |
| conversation-store | conversations.json    | 对话历史                   |
| product-store      | products.json         | 商品目录                   |
| document-store     | documents.json        | 文档库                     |

统一路径通过 `getStoreCwd()` 获取（`src/main/stores/helper.ts`）。

## 导出

通过 `data:export` IPC 通道触发，流程：

1. 弹出系统保存对话框，默认文件名 `xianyu-kefu-backup-{version}-{date}.json`
2. 收集所有 store 数据组装为 `ExportData` 对象
3. 写入 JSON 文件

`ExportData` 结构：

```ts
interface ExportData {
  version: string
  exportedAt: string
  appConfig: AppConfig
  agentConfig: Record<AgentKey, AgentConfig>
  documents: Record<string, string>
  products: Record<string, Product>
}
```

## 导入

通过 `data:import` IPC 通道触发，流程：

1. 弹出系统打开对话框选择 JSON 文件
2. 解析并校验 JSON 格式
3. 版本校验：主版本号必须匹配（如 `0.5.x` 只能导入 `0.5.x` 的备份）
4. 自动备份当前数据到 `{userData}/backups/backup-{timestamp}.json`
5. 全量覆盖所有 store

## 打开数据目录

通过 `data:openDir` IPC 通道触发，使用 `shell.openPath()` 打开 `{userData}/app-data/` 目录。

## IPC 通道

| 通道           | 方向          | 请求类型 | 响应类型                | 说明             |
| -------------- | ------------- | -------- | ----------------------- | ---------------- |
| `data:export`  | renderer→main | —        | `IpcResult<string>`     | 导出，返回文件路径 |
| `data:import`  | renderer→main | —        | `IpcResult<null>`       | 导入              |
| `data:openDir` | renderer→main | —        | `IpcResult<null>`       | 打开数据目录      |

## UI

配置页面顶部的「数据管理」手风琴区域，包含三个按钮：导出数据、导入数据、打开数据目录。默认收起，点击标题栏展开。
