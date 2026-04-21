# Module: Document Store

> 文档库管理 — 文档内容的创建、存储、查询，供 Agent 回复时引用

## 跨层文件

```
src/main/stores/document-store.ts         # 数据持久化（electron-store name='documents'）
src/main/ipc-handlers.ts                  # document:list / get / all / upsert / delete
src/preload/index.ts                      # 暴露 documents.list/getAll/upsert/delete
src/renderer/src/pages/DocumentsPage.tsx  # 文档管理页面
src/shared/defaults/documents/001.json    # 默认文档（产品介绍模板、售后说明）
```

## 数据结构

```typescript
// electron-store 存储
Record<string, string>  // key = 文档标题, value = 文档内容

// 默认文档示例
{
  "产品介绍模板": "这是一款高品质的商品，品质保证，欢迎咨询。",
  "售后说明": "感谢您的购买！如有任何问题，请随时联系客服。"
}
```

## 数据流

```
┌─ 渲染进程（文档管理）─────────────────────────────────────────┐
│                                                                │
│  DocumentsPage.tsx                                             │
│  新增/编辑文档 → window.electron.documents.upsert(title, text) │
│  删除文档     → window.electron.documents.delete(title)        │
└──────┬──────────────────────────────────────────────────────────┘
       │ IPC
┌──────▼─────── 主进程 ─────────────────────────────────────────┐
│  ipc-handlers.ts                                               │
│  document:list    → listDocuments()      返回标题列表          │
│  document:get     → getDocument(key)     返回单个文档内容      │
│  document:all     → getAllDocuments()     返回全部文档          │
│  document:upsert  → upsertDocument(key, content)               │
│  document:delete  → deleteDocument(key)                        │
│                                                                │
│  下游消费者：                                                  │
│  agent.ts → getDocumentsByKeys(keys)                           │
│    → 注入到 LLM system prompt 中，提供文档上下文                │
└───────────────────────────────────────────────────────────────┘
```

## 与商品的关联

文档通过 `ProductsPage` 的多选标签关联到商品：

1. `DocumentsPage` CRUD 文档 → `document:all` 获取文档列表
2. `ProductsPage` 编辑商品时，通过 checkbox 多选关联文档
3. `agent.ts` 处理消息时，根据商品的 `documentTitles` 字段批量查询文档内容
4. 文档内容注入到 LLM system prompt 中，辅助生成回复

## IPC 通道

| 通道              | 方向            | 请求参数                           | 响应类型 `IpcResult<T>`      | 说明         |
| ----------------- | --------------- | ---------------------------------- | ---------------------------- | ------------ |
| `document:list`   | renderer → main | 无                                 | `T = string[]`               | 列出文档标题 |
| `document:get`    | renderer → main | `{key: string}`                    | `T = string \| undefined`    | 获取文档内容 |
| `document:all`    | renderer → main | 无                                 | `T = Record<string, string>` | 获取全部文档 |
| `document:upsert` | renderer → main | `{key: string, content: string}`   | `T = string`                 | 创建或更新   |
| `document:delete` | renderer → main | `{key: string}`                    | `T = null`                   | 删除文档     |

## 存储位置

```
~/.electron-xianyu-kefu/config/documents.json
```

## 相关文档

- [商品目录模块](./product-store.md) — 商品与文档的关联关系
- [IPC 通道文档](../architecture/ipc-channels.md) — 完整通道表
