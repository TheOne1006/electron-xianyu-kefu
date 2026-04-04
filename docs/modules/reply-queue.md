# Module: Reply Queue

> 待发送回复队列 — AI 生成回复后的排队发送机制

## 跨层文件

```
src/main/stores/reply-queue.ts          # 数据持久化（electron-store name='reply-queue'）
src/main/ipc-handlers.ts                # reply-queue:peek / reply-queue:dequeue
src/main/business/agent.ts              # enqueue() 入队
src/injected/message-handler/unread-processor.ts  # 拉取回复 + 确认发送（page-agent 已移除）
```

## 数据流

```
┌─ 主进程（入队）────────────────────────────────────────────┐
│  agent.ts — handleNewUserMessage()                          │
│  消息处理流水线执行完毕：                                     │
│  1. 意图分类 → LLM 生成回复 → 安全过滤                       │
│  2. appendMessage(chatId, aiReply) → 记录 AI 回复            │
│  3. enqueue(chatId) → reply-queue 入队                       │
│     返回 { success: true } 或 { success: false, error }     │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ 注入层轮询拉取（每 10 秒）
       ▼
┌─ 注入层（消费）────────────────────────────────────────────┐
│  unread-processor.ts                                        │
│                                                              │
│  PROCESSING_REPLY 状态：                                     │
│  1. invoke('reply-queue:peek')                               │
│     → getFirst() → 返回 {chatInfo, replyText} | null        │
│  2. 如果有待发送回复：                                        │
│     → 导航到聊天 → 填入 replyText → 点击发送                  │
│  3. invoke('reply-queue:dequeue', {chatId})                  │
│     → dequeue(chatId) → 出队                                 │
└──────────────────────────────────────────────────────────────┘
```

## 状态流转

```
                    enqueue(chatId)
  agent.ts ──────────────────────────→ queue: ["chatId-A"]
                                          │
  unread-processor 轮询                     │ getFirst() → "chatId-A"
                                          │
                    ┌──────────────────────┘
                    ▼
             处理回复：导航 + 填入 + 发送
                    │
                    ▼
          dequeue(chatId-A) via reply-queue:dequeue
                    │
                    ▼
             queue: [] (已清空)
```

## 关键函数

| 层           | 函数                                 | 说明                           |
| ------------ | ------------------------------------ | ------------------------------ |
| main/store   | `enqueue(chatId): {success, error?}` | 入队（幂等，重复 chatId 拒绝） |
| main/store   | `dequeue(chatId): {success}`         | 出队                           |
| main/store   | `getFirst(): string \| null`         | 查看队首（不消费）             |
| main/handler | `reply-queue:peek`                   | 返回队首 chatId 的完整回复数据 |
| main/handler | `reply-queue:dequeue`                | 确认发送，执行 dequeue         |
| main/agent   | `handleNewUserMessage()`             | 生成回复后调用 enqueue         |
| injected     | `unread-processor` tick              | 轮询拉取 + 发送 + 确认         |

## 设计约束

- **幂等入队**：同一 chatId 重复 enqueue 会返回 `{success: false, error: '已存在'}`，防止重复发送
- **FIFO 顺序**：队列按入队顺序处理，先入先出
- **拉取模式**：注入层主动轮询（10s），而非主进程推送。这是有意设计——注入层需要控制发送节奏，避免并发 DOM 操作
- **独立于 conversation**：reply-queue 和 conversation-store 是两个独立模块，queue 只存储 chatId 引用，回复内容从 conversation 中读取
