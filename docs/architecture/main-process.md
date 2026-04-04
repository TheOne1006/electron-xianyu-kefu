# 主进程架构 (Main Process)

> 技术栈：TypeScript 5.9.3 + Electron 39.2.6 + electron-store + consola

## 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                    ipc-handlers.ts                       │
│              (统一 IPC 入口，ok/err wrapper)              │
├──────────────┬──────────────────┬────────────────────────┤
│   stores/    │   business/      │     browser.ts         │
│  数据持久化   │   业务编排        │    窗口管理             │
├──────────────┼──────────────────┤                        │
│ app-config   │ agent.ts         │  createWindow()        │
│ agent-config │ agent-runner.ts  │  createBrowserWindow() │
│ conversation │ intent-router.ts │  sendToBrowser()       │
│ product      │ safety-filter.ts │                        │
│ reply-queue  │                  │                        │
└──────────────┴──────────────────┴────────────────────────┘
         │               │                    │
         ▼               ▼                    ▼
    electron-store    OpenAI API         BrowserWindow
```

## 模块职责

### ipc-handlers.ts — IPC 统一入口

所有 IPC 通道的 `ipcMain.handle()` 注册点。响应格式统一为 `IpcResult<T>`：

```typescript
// 成功：{ code: 0, message: '', data: T }
// 失败：{ code: N, message: '错误描述', data: null }
```

**约束：IPC handler 入参数据必须经过校验**（建议使用 zod schema），防止渲染进程/注入层传入非法数据。

### stores/ — 数据持久化层

全部基于 `electron-store`，每个 store 独立一个文件，提供类型安全的 CRUD 操作。

| Store      | 文件名                  | electron-store name | 类型                            |
| ---------- | ----------------------- | ------------------- | ------------------------------- |
| 应用配置   | `app-config-store.ts`   | `config`            | `AppConfig`                     |
| Agent 配置 | `agent-config-store.ts` | `agent-config`      | `Record<AgentKey, AgentConfig>` |
| 对话历史   | `conversation-store.ts` | `conversations`     | 按聊天 ID 存储                  |
| 商品目录   | `product-store.ts`      | `products`          | `Product[]`                     |
| 回复队列   | `reply-queue.ts`        | `reply-queue`       | 队列结构                        |

**Store 编写规范：**

- 导出 `getXxx()` / `saveXxx()` / `deleteXxx()` 函数式 API（不导出 class 实例）
- 默认值从 `src/shared/defaults/` 加载
- ID 类参数使用 `safeId()` 清洗（见 `stores/helper.ts`）

### business/ — 业务编排层

**业务逻辑设计约束：**

1. **Model 层（stores/）只做数据存取**，不包含业务判断逻辑
2. **Controller 层（ipc-handlers.ts）只做参数校验 + 调度**，不包含业务流程
3. **业务流程集中在 business/ 模块**，保持可测试性

**消息处理流水线：**

```
收到新消息 → agent.ts (编排器)
  ├── 1. 过滤非用户文本消息
  ├── 2. 创建/更新对话记录 (conversation-store)
  ├── 3. 获取关联商品信息 (product-store)
  ├── 4. 意图分类 (intent-router.ts)
  │     ├── 关键词/regex 快速路径（price/tech）
  │     └── LLM 兜底分类（classify agent）
  ├── 5. 执行对应 Agent (agent-runner.ts)
  │     ├── 构建系统提示词（agent prompt + 商品信息）
  │     ├── 构建消息历史（角色映射）
  │     ├── 调用 OpenAI API
  │     └── 安全过滤 (safety-filter.ts)
  └── 6. 记录 AI 回复 + 入队发送 (reply-queue)
```

**5 个 Agent 类型：**

- `system` — 系统级指令
- `classify` — 意图分类专用
- `default` — 通用回复
- `price` — 价格/砍价相关
- `tech` — 技术问题相关

### browser.ts — 窗口管理

- `createWindow(config)` — 通用窗口工厂
- `createBrowserWindow(appConfig)` — 创建闲鱼浏览器窗口
- `sendToBrowser(channel, data)` — 向浏览器窗口发送 IPC 消息
- `getMainWindow()` / `getBrowserWindow()` — 获取窗口引用

## IPC 数据校验规范

IPC handler 接收的外部数据（来自渲染进程或注入层）属于不可信输入，需要校验：

```typescript
// 推荐模式：在 handler 入口使用 zod schema 校验
import { z } from 'zod'

const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  price: z.string().optional(),
  images: z.array(z.string()).optional()
})

ipcMain.handle('product:upsert', (_event, raw: unknown) => {
  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) {
    return err(400, `参数校验失败: ${parsed.error.message}`)
  }
  // ...业务逻辑
})
```

## 主进程入口 (index.ts)

仅 63 行，职责清晰：

1. 注册 IPC handlers
2. 创建主窗口
3. 管理 app 生命周期（ready / activate / window-all-closed）

## 默认资源加载

`src/shared/defaults/` 下的文件在首次运行时加载到 electron-store 的 defaults 中：

```
src/shared/defaults/
├── configs/app-config.json     → app-config-store defaults
├── prompts/{agent}.json (×5)   → agent-config-store defaults
└── products/001.json            → product-store defaults
```

## 相关文档

- [IPC 通道详细文档](./ipc-channels.md)
- [测试方案](./testing.md)
