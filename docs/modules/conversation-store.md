# Module: Conversation Store

> 对话历史管理 — 聊天会话的创建、消息追加、历史查询

## 跨层文件

```
src/shared/types.ts                     # ConversationInput / ChatMessage / ChatInfo
src/main/stores/conversation-store.ts   # 数据持久化（electron-store name='conversations'）
src/main/ipc-handlers.ts                # conversation:list / getById / createOrUpdate / delete
src/main/business/agent.ts              # 创建对话 + 追加 AI 回复
src/preload/index.ts                    # 暴露 chat.list/getById/add/updateById/delete
src/renderer/src/pages/ChatsPage.tsx    # 对话历史页面（分栏布局）
src/renderer/src/components/ChatComponents/  # 聊天相关组件
│   ├── ChatSessionList.tsx             # 会话列表
│   ├── ChatMessageList.tsx             # 消息列表（按日期分组）
│   └── ChatInput.tsx                   # 手动回复输入
src/injected/message-handler/unread-processor.ts  # 推送新消息到主进程（page-agent 已移除）
src/injected/message-handler/routers/im-router.ts # IM 消息路由
src/injected/ipc/channels.ts            # CONVERSATION_UPSERT 通道常量
```

## 数据流

```
┌─ 注入层（数据采集）─────────────────────────────────────────┐
│  unread-processor.ts                                        │
│  检测未读 → 点击会话 → im-helpers 提取 DOM                    │
│      │                                                      │
│      ▼ __electronIPC.invoke('conversation:upsert', packet)  │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼─────── 主进程 ──────────────────────────────────────┐
│  ipc-handlers.ts                                            │
│  conversation:createOrUpdate → store.createOrUpdate(packet) │
│                                                              │
│  agent.ts（自动回复流水线）                                    │
│  1. createOrUpdate(data)     → 记录用户消息                   │
│  2. 意图分类 + LLM 生成回复                                   │
│  3. appendMessage(chatId, aiReply) → 追加 AI 回复             │
│  4. enqueue(chatId)          → 入队待发送                     │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼─────── 渲染进程（历史查看）──────────────────────────┐
│  ChatsPage.tsx                                              │
│  左栏：chat.list() → 会话列表（用户名/最后消息/时间/未读）     │
│  右栏：chat.getById(chatId) → 消息历史（按日期分组显示）       │
│  底部：ChatInput → chat.sendReply(chatId, content)           │
└──────────────────────────────────────────────────────────────┘
```

## 核心数据结构

```typescript
/** 完整消息包 — 注入层推送到主进程的数据单元 */
interface ConversationInput {
  chatInfo: ChatInfo // 会话元信息
  messages: ChatMessage[] // 消息列表
}

/** 聊天会话信息 */
interface ChatInfo {
  userName: string // 对方用户名
  itemId: string // 关联商品 ID
  isMyProduct: boolean // 是否为我发布的商品
}

/** 单条消息 */
interface ChatMessage {
  type: 'text' | 'image' | 'card'
  sender: string
  isSelf: boolean // true = 卖家(我方)
  content?: string
  cardInfo?: CardInfo
  imageUrl?: string
}
```

## ChatId 生成规则

```typescript
// conversation-store.ts
buildChatId(userName: string, itemId: string): string
// 规则：userName + '-' + itemId，特殊字符替换为下划线
// 示例："用户A-123456"
```

## 关键函数

| 层         | 函数                                | 说明                 |
| ---------- | ----------------------------------- | -------------------- |
| main/store | `buildChatId(userName, itemId)`     | 生成唯一会话 ID      |
| main/store | `createOrUpdate(packet)`            | 创建或更新对话记录（无条件保存，不校验商品存在性） |
| main/store | `appendMessage(chatId, msg, isSelf?)` | 追加单条消息（isSelf 默认 true） |
| main/store | `getById(chatId)`                   | 获取指定对话         |
| main/store | `list()`                            | 列出全部对话         |
| main/store | `deleteById(chatId)`                | 删除对话             |
| main/agent | `handleNewUserMessage(data)`        | 编排完整处理流程     |
| injected   | `im-router` → `conversation:upsert` | 推送采集到的消息     |
| renderer   | `chat.list()` / `chat.getById()`    | 查看历史             |

## 设计约束

- **幂等写入**：`createOrUpdate` 对同一 chatId 重复调用不会产生重复记录
- **消息方向判定**：`isSelf=true` 为卖家（我方），`isSelf=false` 为买家消息，Agent 仅处理 `isSelf=false` 的文本消息
- **对话历史无上限**：当前未做消息数量截断，长期运行可能导致单个对话过大
- **无条件记录**：`createOrUpdate` 不校验关联商品是否存在，对话记录始终保存。商品缺失仅影响业务逻辑（自动发货/Webhook 跳过），不影响记录本身。
