# 闲鱼客服自动化 PRD

## 1. 核心目的

### 1.1 项目背景

闲鱼二手交易平台客服需求痛点：

- 人工客服成本高、响应慢，难以覆盖海量咨询
- 客户期望快速响应，夜间/节假日无人值守
- 重复性问题（价格咨询、商品状态）占用大量人工精力

本项目通过 AI 助手自动处理客户咨询，实现 24 小时智能客服。

### 1.2 核心价值

| 价值点                | 说明                                      |
| --------------------- | ----------------------------------------- |
| 24 小时自动回复       | 摆脱人工时间限制，夜间节假日照常服务      |
| 意图分类 + 个性化回复 | 根据对话上下文生成专业、友好的回复        |
| 对话历史持久化        | 积累真实对话数据，为后续模型训练提供语料  |
| 人工接管机制          | AI 无法处理时自动标记，确保不出现答非所问 |

### 1.3 范围界定（V1）

**做：**

- 自动检测闲鱼网页未读消息
- AI 自动生成并发送回复
- 对话历史持久化到本地 txt 文件（可用于训练数据积累）
- 人工接管自动检测（AI 回复仅含配置字符时触发）

**不做：**

- 商品上下架管理
- 订单系统集成
- 多账号支持
- 统计报表

---

## 2. 业务流程

### 2.1 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                     Electron 主窗口 (React UI)                     │
│  配置面板 · 启停控制 · 实时日志                                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │ IPC (config:get / config:save)

┌────────────────────────────▼─────────────────────────────────────┐
│                     Electron 主进程 (Node.js)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ BusinessAgent                                                   │    │
│  │  ├─ IntentRouter    意图分类 + HUMAN_TOGGLE_KEYWORDS 检测 │    │
│  │  ├─ PromptManager   提示词加载 / 热更新                    │    │
│  │  ├─ LLMClient       OpenAI 兼容 API 调用                  │    │
│  │  └─ SafetyFilter    敏感词安全过滤                        │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  AgentConfigStore / ProductStore / ConversationStore / ReplyQueue  │
└──────▲────────────────────────▲────────────────────────▲────────┘
       │                        │                        │
       │ IPC                    │ IPC                    │ script 注入
       │ conversation:upsert  │ reply-queue:enqueue     │
       │ product:upsert       │ reply-queue:peek        │
       │                        │ reply-queue:dequeue     ▼
┌──────┴───────────────────────────────────────────────────────────┐
│                   浏览器窗口 (闲鱼网页 https://goofish.com)          │
│                                                                   │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │ im-helpers (注入脚本)    │    │ message-handler (注入脚本)   │ │
│  │  ├─ hasUnreadMessages() │    │  提供消息处理 + DOM 操作能力   │ │
│  │  ├─ getChatList()       │    │  ├─ UnreadProcessor          │ │
│  │  ├─ getChatMessages()   │    │  │   └─ 10s 轮询状态机        │ │
│  │  ├─ getCurrentChatInfo()│    │  ├─ ProductCollector         │ │
│  │  └─ sendMessage()       │    │  └─ 路由分发                  │ │
│  └─────────────────────────┘    └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 核心流程（7 步）

```
步骤 1 ─ 检测
chat-helpers 每 5 秒轮询 hasUnreadMessages()
    └─ 无未读 → 跳过本轮

步骤 2 ─ 提取
    └─ 有未读 → getChatList() 找到第一个未读用户会话
    └─ 点击该会话项切换聊天
    └─ getChatMessages() 提取当前聊天消息列表

步骤 3 ─ 推送
    └─ 前置过滤：只保留 isSelf=false（用户发送）的文本消息
    └─ IPC push conversation:upsert 完整数据包到主进程
       数据包：{ chatInfo, messages, unreadConversations, newMessages }

步骤 4 ─ 意图分类 + 人工接管检测（BusinessAgent / IntentRouter）
    └─ IntentRouter 接收 newMessages
    └─ HUMAN_TOGGLE_KEYWORDS 检测（isSelf=true 且内容仅为触发字符）
        └─ 命中 → 标记"人工接管"，仅记录到对话历史，跳过后续 LLM 生成
    └─ 正常意图分类（LLM）
        └─ bargain / inquiry / greeting / order / other

步骤 5 ─ 生成（BusinessAgent）
    └─ IntentRouter 判定为正常意图后继续
    └─ 与 txt 历史对比去重
    └─ 构建系统提示词（对话历史 + 商品信息）
    └─ 调用 LLM API 生成回复

步骤 6 ─ 过滤
    └─ 安全过滤（敏感词检测）

步骤 7 ─ 发送
    └─ reply-queue:enqueue → 注入层执行 DOM 发送
    └─ 写入对话记录到文件
```

### 2.3 配置项（AppConfig）

| 字段                    | 类型               | 默认值                      | 说明                                                       |
| ----------------------- | ------------------ | --------------------------- | ---------------------------------------------------------- |
| `model`                 | string             | MiniMax-M2.7                | LLM 模型名称                                               |
| `baseURL`               | string             | https://api.minimaxi.com/v1 | LLM API 地址                                               |
| `apiKey`                | string             | -                           | LLM API 密钥                                               |
| `humanTakeoverKeywords` | string             | "。"                        | 检测到此关键词（isSelf=true）时判定人工接管，跳过 LLM 生成 |

---

## 3. 模块职责

### 3.1 各层职责

| 模块              | 进程               | 职责                                                                                           |
| ----------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| im-helpers        | injected（浏览器） | DOM 解析、未读检测、消息提取、DOM 发送消息                                                     |
| message-handler   | injected（浏览器） | 10s 轮询状态机（UnreadProcessor）、商品采集（ProductCollector）、路由分发（page-agent 已移除） |
| BusinessAgent     | main（Node.js）    | 意图分类（含 HUMAN_TOGGLE_KEYWORDS 检测）、LLM 调用编排、提示词管理、安全过滤                  |
| agent-log         | main（Node.js）    | 日志内存存储（最多100条）、实时推送渲染进程、导出 logInfo/logWarn/logError/logDebug            |
| ConversationStore | main（Node.js）    | 对话历史 JSON 文件读写、对话上下文加载                                                         |
| ProductStore      | main（Node.js）    | 商品目录持久化（electron-store）                                                               |
| AgentConfigStore  | main（Node.js）    | Agent 配置持久化（electron-store）                                                             |
| ReplyQueue        | main（Node.js）    | 待发送回复队列（内存）                                                                         |
| preload           | bridge             | 暴露安全 IPC API 给 renderer 和注入层                                                          |
| ChatsPage         | renderer（React）  | 聊天历史查看、手动发送回复                                                                     |
| PromptsPage       | renderer（React）  | Agent 提示词编辑                                                                               |
| ConfigsPage       | renderer（React）  | LLM 配置、应用配置                                                                             |
| ProductsPage      | renderer（React）  | 商品目录 CRUD（统一弹窗表单，关联文档多选）                                                   |
| DocumentsPage     | renderer（React）  | 文档库管理（CRUD）                                                                            |

### 3.2 命名规范

**目录与模块命名：**

- 使用完整英文单词，**禁止使用缩写**（如 `biz` → `business`）
- 业务逻辑目录：`src/main/business/`（注意是 `business` 全称，不是 `biz`）
- 业务编排模块：`BusinessAgent`（不是 `BizAgent`）

### 3.3 IPC 通道

详细通道说明请参阅 [docs/architecture/ipc-channels.md](./architecture/ipc-channels.md)。

**主要通道一览：**

| 通道                  | 方向                     | 说明                                 |
| --------------------- | ------------------------ | ------------------------------------ |
| `conversation:upsert` | injected → main          | 注入层推送有效用户新消息             |
| `reply-queue:peek`    | injected → main          | message-handler 轮询获取待发回复     |
| `reply-queue:dequeue` | injected → main          | message-handler 发送完成后通知主进程 |
| `reply-queue:enqueue` | renderer → main          | 手动发送回复                         |
| `product:upsert`      | renderer/injected → main | 创建或更新商品                       |
| `document:all`        | renderer → main          | 获取全部文档                         |
| `document:upsert`     | renderer → main          | 创建或更新文档                       |
| `document:delete`     | renderer → main          | 删除文档                            |
| `product:list`        | renderer → main          | 获取商品列表                         |
| `agent-config:all`    | renderer → main          | 获取全部 Agent 配置                  |
| `agent-config:update` | renderer → main          | 更新 Agent 配置                      |
| `config:get`          | renderer → main          | 获取应用配置                         |
| `config:save`         | renderer → main          | 保存应用配置                         |

### 3.4 数据存储

数据存储采用 electron-store 统一管理，详见各模块文档：

- [modules/app-config.md](./modules/app-config.md) — 应用配置
- [modules/agent-config.md](./modules/agent-config.md) — Agent 配置
- [modules/conversation-store.md](./modules/conversation-store.md) — 对话历史
- [modules/product-store.md](./modules/product-store.md) — 商品目录

**存储结构（electron-store 扁平化）：**

```
~/.electron-xianyu-kefu/
└── config/
    ├── config.json             # 应用配置（AppConfig）
    ├── agent-config.json       # Agent 配置（Record<AgentKey, AgentConfig>）
    ├── conversations.json      # 对话历史（Record<string, ConversationInput>）
    ├── products.json           # 商品目录（Record<string, Product>）
    └── documents.json          # 文档库（Record<string, string>，key=标题，value=内容）
```

**核心类型：**

```typescript
// 对话输入 — injected 通过 IPC 推送到 main
interface ConversationInput {
  chatInfo: ChatInfo // 会话元信息
  messages: ChatMessage[] // 消息列表
}

interface ChatInfo {
  userName: string // 对方用户名
  itemId: string | null // 关联商品 ID
  isMyProduct: boolean // 是否为我发布的商品
}

interface ChatMessage {
  type: 'text' | 'image' | 'card'
  sender: string
  isSelf: boolean
  content?: string
  cardInfo?: CardInfo
  imageUrl?: string
}
```

---

## 4. 用户故事

| #    | 用户故事                                       | 验收标准                                                             |
| ---- | ---------------------------------------------- | -------------------------------------------------------------------- |
| US-1 | 作为客服，我希望自动回复客户消息               | 收到客户消息后 10 秒内生成并发送回复                                 |
| US-2 | 作为运营，我希望配置 LLM 参数                  | 可在 UI 配置模型、API 地址、API 密钥、人工接管触发字符               |
| US-3 | 作为客服，我希望查看对话历史                   | 可在聊天页面查看历史消息                                             |
| US-4 | 作为客服，我希望手动接管对话                   | 点击停止按钮后立即停止自动回复，不再生成新回复                       |
| US-5 | 作为客服，我希望 AI 无法回复时自动标记人工接管 | 当 AI 回复仅为配置的特殊字符时，系统跳过发送但保持记录，等待人工处理 |

---

## 5. 参考文档

详细技术架构和业务模块说明请参阅以下文档：

### 技术架构

| 文档                                                                   | 说明                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| [architecture/main-process.md](./architecture/main-process.md)         | 主进程架构 — IPC handler、业务流水线、Store 层   |
| [architecture/renderer-process.md](./architecture/renderer-process.md) | 渲染进程架构 — React 路由、UI 布局               |
| [architecture/bridge-layer.md](./architecture/bridge-layer.md)         | 桥接层架构 — preload 注入方案、esbuild IIFE 编译 |
| [architecture/ipc-channels.md](./architecture/ipc-channels.md)         | IPC 通道详细文档 — 全部通道表                    |
| [architecture/testing.md](./architecture/testing.md)                   | 测试方案 — mock 策略、各层测试规范               |

### 业务模块

| 文档                                                             | 说明                                          |
| ---------------------------------------------------------------- | --------------------------------------------- |
| [modules/app-config.md](./modules/app-config.md)                 | 应用配置 — LLM 参数、浏览器 URL、安全过滤     |
| [modules/agent-config.md](./modules/agent-config.md)             | Agent 配置 — 5 个 Agent 的提示词和推理参数    |
| [modules/conversation-store.md](./modules/conversation-store.md) | 对话历史 — 消息采集、存储、AI 回复追加        |
| [modules/product-store.md](./modules/product-store.md)           | 商品目录 — DOM 采集、持久化、Agent 上下文注入 |
| [modules/reply-queue.md](./modules/reply-queue.md)               | 回复队列 — AI 回复入队/出队、注入层轮询发送   |
| [modules/injected-bundles.md](./modules/injected-bundles.md)     | 注入脚本 — esbuild IIFE 编译、页面路由分发    |

---

## 6. 备注

- 对话历史文件可用于后续模型训练数据积累，具体训练流程不在 V1 范围内。
