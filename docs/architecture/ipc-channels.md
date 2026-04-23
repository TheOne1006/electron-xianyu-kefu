# IPC 通道详细文档

> 所有 IPC 通道使用 `invoke/handle` 双向模式，统一返回 `IpcResult<T>` 格式。
> 成功：`{code: 0, message: '', data: T}` / 失败：`{code: N, message: '...', data: null}`

## 通道全景图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        渲染进程 (React)                               │
│                                                                       │
│ config.*  xy-browser.*  agent-config.*  product.*  conversation.*  document.* │
└────────┬───────────────┬───────────────┬───────────┬──────────┬──────┘
         │               │               │           │           │
    ┌────▼───────────────▼───────────────▼───────────▼───────────▼────┐
    │              preload/index.ts (contextBridge)                   │
    │              ipcRenderer.invoke(channel, ...args)              │
    └────┬───────────────┬───────────────┬───────────┬───────────┬────┘
         │               │               │           │           │
    ┌────▼───────────────▼───────────────▼───────────▼───────────▼────┐
    │              ipc-handlers.ts (ipcMain.handle)                   │
    │              统一 IpcResult<T> 响应包装                          │
    └─────────────────────────────────────────────────────────────────┘
         ▲
         │  reply-queue:dequeue
         │  conversation:upsert / reply-queue:enqueue
         │  product:upsert
    ┌────┴────────────────────────────────────────────────────────────┐
    │              preload-browser.ts (__electronIPC 桥接)             │
    │              注入层通过 window.__electronIPC.invoke() 调用       │
    └─────────────────────────────────────────────────────────────────┘
         ▲
         │  (仅在浏览器窗口内使用)
    ┌────┴────────────────────────────────────────────────────────────┐
    │                   注入层 (message-handler + helpers)                │
    └─────────────────────────────────────────────────────────────────┘
```

## 已注册通道

### Config（应用配置）

| 通道          | 方向            | 请求参数             | 响应类型 `IpcResult<T>` | 说明               |
| ------------- | --------------- | -------------------- | ----------------------- | ------------------ |
| `config:get`  | renderer → main | 无                   | `T = AppConfig`         | 获取完整应用配置   |
| `config:save` | renderer → main | `Partial<AppConfig>` | `T = null`              | 保存配置（浅合并） |

### XY Browser（闲鱼浏览器窗口）

| 通道                   | 方向            | 请求参数    | 响应类型 `IpcResult<T>` | 说明               |
| ---------------------- | --------------- | ----------- | ----------------------- | ------------------ |
| `xy-browser:launch`    | renderer → main | `AppConfig` | `T = null`              | 启动闲鱼浏览器窗口 |
| `xy-browser:close`     | renderer → main | 无          | `T = null`              | 关闭闲鱼浏览器窗口 |
| `xy-browser:getStatus` | renderer → main | 无          | `T = BrowserStatus`     | 获取浏览器窗口状态 |

### Conversation（对话历史）

| 通道                          | 方向            | 请求参数            | 响应类型 `IpcResult<T>`         | 说明                                    |
| ----------------------------- | --------------- | ------------------- | ------------------------------- | --------------------------------------- |
| `conversation:upsert`         | injected → main | `ConversationInput` | `T = null`                      | 推送新消息到 Agent 流水线（注入层专用） |
| `conversation:createOrUpdate` | renderer → main | `Conversation`      | `T = Conversation`              | 创建或更新对话（渲染进程专用）          |
| `conversation:list`           | renderer → main | 无                  | `T = ConversationInput[]`       | 列出全部对话                            |
| `conversation:getById`        | renderer → main | `{chatId: string}`  | `T = ConversationInput \| null` | 获取指定对话                            |
| `conversation:delete`         | renderer → main | `{chatId: string}`  | `T = null`                      | 删除指定对话                            |

### Reply Queue（回复队列）

| 通道                  | 方向            | 请求参数                            | 响应类型 `IpcResult<T>`  | 说明               |
| --------------------- | --------------- | ----------------------------------- | ------------------------ | ------------------ |
| `reply-queue:dequeue` | injected → main | 无                                  | `T = string \| null`     | 拉取并发送 AI 回复 |
| `reply-queue:enqueue` | renderer → main | `{chatId: string, content: string}` | `T = {success: boolean}` | 手动发送回复到队列 |

### Agent Config（Agent 配置）

| 通道                   | 方向            | 请求参数                               | 响应类型 `IpcResult<T>`             | 说明                               |
| ---------------------- | --------------- | -------------------------------------- | ----------------------------------- | ---------------------------------- |
| `agent-config:all`     | renderer → main | 无                                     | `T = Record<AgentKey, AgentConfig>` | 获取全部 Agent 配置                |
| `agent-config:getById` | renderer → main | `{key: AgentKey}`                      | `T = AgentConfig`                   | 获取指定 Agent 配置                |
| `agent-config:update`  | renderer → main | `{key: AgentKey, config: AgentConfig}` | `T = null`                          | 更新 Agent 配置（含 prompt）       |
| `agent-config:upsert`  | renderer → main | `{key: AgentKey, config: AgentConfig}` | `T = null`                          | 全量替换 Agent 配置（upsert 语义） |

### Product（商品管理）

| 通道                 | 方向                       | 请求参数       | 响应类型 `IpcResult<T>` | 说明           |
| -------------------- | -------------------------- | -------------- | ----------------------- | -------------- |
| `product:list`       | renderer → main            | 无             | `T = Product[]`         | 列出全部商品   |
| `product:getById`    | renderer → main            | `{id: string}` | `T = Product \| null`   | 获取指定商品   |
| `product:upsert`     | renderer / injected → main | `Product`      | `T = Product`           | 创建或更新商品 |
| `product:deleteById` | renderer → main            | `{id: string}` | `T = null`              | 删除指定商品   |

### Document（文档管理）

| 通道              | 方向            | 请求参数                           | 响应类型 `IpcResult<T>`      | 说明           |
| ----------------- | --------------- | ---------------------------------- | ---------------------------- | -------------- |
| `document:all`    | renderer → main | 无                                 | `T = Record<string, string>` | 获取全部文档   |
| `document:upsert` | renderer → main | `{title: string, content: string}` | `T = Record<string, string>` | 创建或更新文档 |
| `document:delete` | renderer → main | `{title: string}`                  | `T = null`                   | 删除指定文档   |

### 测试

| 通道   | 方向            | 请求参数 | 响应类型 `IpcResult<T>` | 说明     |
| ------ | --------------- | -------- | ----------------------- | -------- |
| `ping` | renderer → main | 无       | `T = 'pong'`            | 健康检查 |

## 待实现通道

以下通道在 `preload/index.ts` 中已声明，但 `ipc-handlers.ts` 尚未注册 handler：

### Prompts（提示词管理）

> **已由 `agent-config:*` 通道替代**。Prompts 作为 AgentConfig 的一部分，通过 `agent-config:update` 统一管理，不再单独提供 CRUD 通道。保留此处仅作为历史参考。

| 通道                 | 预期请求参数                    | 预期响应                 | 说明                       |
| -------------------- | ------------------------------- | ------------------------ | -------------------------- |
| `prompts:list`       | 无                              | `Record<string, string>` | 列出全部提示词             |
| `prompts:getById`    | `{id: string}`                  | `string`                 | 获取指定提示词内容         |
| `prompts:add`        | `{id: string, content: string}` | `void`                   | 新增提示词                 |
| `prompts:updateById` | `{id: string, content: string}` | `void`                   | 更新提示词                 |
| `prompts:delete`     | `{id: string}`                  | `string`                 | 删除提示词（返回默认内容） |

## 通道命名规范

```
{domain}:{action}

domain  = 业务域（config / xy-browser / agent-config / product / conversation / reply-queue / document）
action  = 操作（get / save / list / getById / createOrUpdate / upsert / deleteById / delete / enqueue / dequeue / launch / ...）
```

**多词操作使用 camelCase**：`getById`、`deleteById`

## 相关文档

- [主进程架构](./main-process.md) — IPC handler 实现细节
- [桥接层架构](./bridge-layer.md) — 注入层 IPC 客户端
