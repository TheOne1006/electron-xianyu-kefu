# 事件驱动架构改造：MutationObserver + 主进程指令推送

**日期**: 2026-04-21
**状态**: 已确认
**影响范围**: `src/injected/im-robot.ts`（核心）、`src/main/business/agent.ts`、`src/main/browser.ts`

## 1. 背景与问题

当前 ImRobot 采用 `setInterval` 10 秒轮询方案检测未读消息和拉取回复。存在两个核心问题：

1. **响应延迟高** — 未读消息平均需要 5 秒才能被检测到，回复发送同样需要等待轮询周期
2. **主进程无法主动推送** — 回复队列只能靠注入脚本轮询拉取，主进程无法即时触发发送

## 2. 方案选择

**选定方案：MutationObserver 实时监听 + executeJavaScript 主动推送**

| 方案 | 监听方式 | 推送方式 | 改动量 | 响应速度 |
|------|---------|---------|--------|---------|
| A（选定） | MutationObserver | executeJavaScript | 中 | 毫秒级 |
| B | MutationObserver | 回复队列 + 短轮询 | 小 | 1-2s |
| C | 无监听 | 完全重构 | 大 | 毫秒级 |

## 3. 架构总览

### 3.1 通信流程改造

**改造前：**

```
左侧 DOM → 10s 轮询检测 → ImRobot tick → IPC 上报
主进程入队 → reply-queue → 注入脚本 10s 轮询拉取 → 执行发送
```

**改造后：**

```
左侧 DOM → MutationObserver 实时检测 → ImRobot 处理 → IPC 上报
主进程完成 Agent → executeJavaScript 推送指令 → ImRobot 立即执行发送
```

### 3.2 核心变更点

| 组件 | 当前行为 | 改造后行为 |
|------|---------|-----------|
| `ImRobot.tick()` | setInterval 10s 轮询 | 事件驱动，Observer 触发 |
| `ImRobot.handleReply()` | 从 reply-queue 轮询拉取 | 主进程通过 executeJavaScript 直接调用 |
| `ImRobot.handleCollect()` | tick 中检测未读后采集 | MutationObserver 触发采集 |
| 主进程→注入通信 | reply-queue + 轮询 | `webContents.executeJavaScript()` |
| 注入→主进程通信 | IPC（保持不变） | IPC（保持不变） |

### 3.3 保留不变的部分

- `ImDomExtractor` — DOM 提取逻辑不变
- `agent.ts` / `agent-runner.ts` — 主进程业务流水线不变
- `preload-browser.ts` — IPC 桥接不变
- `intent-router.ts` — 意图分类不变
- 状态机状态定义基本不变（IDLE / PROCESSING_REPLY / PROCESSING_COLLECT / CLEANUP）

## 4. MutationObserver 监听机制

### 4.1 监听目标

监听左侧会话列表容器（类似 `div[class*="conversation-list"]` 或包含多个会话项的滚动容器），选择器策略保持 `class*=` 模糊匹配。具体选择器需在真实闲鱼页面中确认。

### 4.2 触发逻辑

```
MutationObserver 检测到 DOM 变化
    │
    ▼
debounce 300ms（避免短时间内多次触发）
    │
    ▼
检查状态机当前状态
    ├── IDLE → 执行采集流程（handleCollect）
    └── 非 IDLE → 忽略（等当前任务完成后下一轮处理）
```

### 4.3 Observer 配置

```typescript
{
  childList: true,      // 监听子节点增删
  subtree: true,        // 监听所有后代节点
  characterData: true   // 监听文本变化（未读数字变化）
}
```

### 4.4 关注的变化类型

1. **未读 badge 出现/变化** — 新增 `sup.ant-badge-count` 元素或其文本/属性变化
2. **会话项顺序变化** — 会话列表重新排序（新消息的会话会置顶）
3. **新会话项出现** — 之前不存在的会话项被添加

### 4.5 回退机制

如果 5 秒内 Observer 未检测到变化，保留一个低频轮询（30s）作为兜底，防止 Observer 因 DOM 结构变化而失效。

## 5. 主进程主动推送机制

### 5.1 注入脚本端：命令注册

```typescript
// 注入脚本中注册全局命令接口
window.__robotCommands = {
  async sendReply(chatId: string, replyText: string) {
    if (imRobot.state !== 'IDLE') {
      return { success: false, reason: 'busy', state: imRobot.state }
    }
    imRobot.state = 'PROCESSING_REPLY'
    try {
      await imRobot.executeReply(chatId, replyText)
      return { success: true }
    } finally {
      imRobot.state = 'IDLE'
    }
  },

  getStatus() {
    return { state: imRobot.state, lastActivity: imRobot.lastActivity }
  }
}
```

### 5.2 主进程端：指令推送

```typescript
// agent.ts 完成处理后
async function pushReplyToInjector(
  bw: BrowserWindow,
  chatId: string,
  text: string
): Promise<void> {
  const result = await bw.webContents.executeJavaScript(
    `window.__robotCommands?.sendReply('${chatId}', ${JSON.stringify(text)})`
  )
  if (!result?.success) {
    // 回退到 reply-queue 兜底
    enqueue(chatId)
  }
}
```

### 5.3 回退策略

- 如果 `executeJavaScript` 返回 `success: false`（注入脚本忙），回退到 reply-queue 入队
- 注入脚本的低频轮询兜底会处理 reply-queue 中的积压消息
- 确保**零消息丢失**

### 5.4 安全考虑

- `executeJavaScript` 参数通过 `JSON.stringify` 转义，防止注入攻击
- 命令函数只暴露必要的操作，不暴露内部状态修改能力

## 6. 状态机改造

### 6.1 改造后状态流转

```
                    MutationObserver 触发
                           │
                           ▼
                      ┌─────────┐
                      │   IDLE   │ ◄──────────────────┐
                      └────┬─────┘                     │
                           │                           │
              ┌────────────┼────────────┐              │
              ▼                         ▼              │
    ┌──────────────────┐    ┌──────────────────────┐  │
    │ PROCESSING_COLLECT│    │ PROCESSING_REPLY      │  │
    │ (Observer 触发)   │    │ (executeJS 触发)      │  │
    └────────┬──────────┘    └───────────┬──────────┘  │
             │                           │              │
             ▼                           ▼              │
    采集 DOM → IPC 上报      导航 + 输入 + 发送         │
             │                           │              │
             └───────────┬───────────────┘              │
                         ▼                              │
                    ┌──────────┐                        │
                    │ CLEANUP  │ ───────────────────────┘
                    └──────────┘
```

### 6.2 关键改造点

1. **去掉 setInterval 轮询 tick** — 不再需要 10s 定时器
2. **新增 Observer 驱动的 `onDomChange()`** — 替代 tick 中的未读检测
3. **新增 `executeReply(chatId, text)` 方法** — 替代 `fetchPendingReply()`，直接接收参数
4. **保留 `likeHumanClick()` 等模拟操作** — 发送流程的模拟逻辑不变
5. **保留低频兜底轮询（30s）** — 作为 Observer 失效时的安全网

### 6.3 命令接口

```typescript
interface RobotCommands {
  sendReply(chatId: string, replyText: string): Promise<CommandResult>
  getStatus(): { state: AgentState; lastActivity: number }
}

interface CommandResult {
  success: boolean
  reason?: string
  state?: AgentState
}
```

## 7. 需要修改的文件

### 7.1 核心修改

| 文件 | 改动内容 |
|------|---------|
| `src/injected/im-robot.ts` | 去掉 setInterval，新增 MutationObserver，新增命令注册，改造状态机触发方式 |
| `src/main/business/agent.ts` | Agent 处理完成后调用 `pushReplyToInjector()` 主动推送，保留 reply-queue 作为回退 |
| `src/main/browser.ts` | 暴露 BrowserWindow 实例供 agent.ts 推送指令 |
| `src/injected/types.ts` | 新增 `RobotCommands`、`CommandResult` 类型 |

### 7.2 可能微调

| 文件 | 说明 |
|------|------|
| `src/main/ipc-handlers.ts` | 可能需要新增通道查询注入脚本状态 |
| `src/main/stores/reply-queue.ts` | 保留但降低优先级，作为回退队列 |

### 7.3 不需要修改

- `src/injected/im-dom-extractor.ts` — DOM 提取逻辑完全不变
- `src/main/business/agent-runner.ts` — LLM 执行引擎不变
- `src/main/business/intent-router.ts` — 意图分类不变
- `src/preload/preload-browser.ts` — IPC 桥接不变
- `src/injected/product-collector.ts` — 商品采集不变
- 渲染进程所有文件 — 不受影响

## 8. 改动量评估

- 核心改动集中在 `im-robot.ts`（状态机重构）和 `agent.ts`（推送逻辑）
- 预计改动约 200-300 行代码
- 对现有功能影响较小，可增量迁移
- 现有 E2E 测试需要适配新的触发方式（从 triggerTick 改为直接调用命令函数）

## 9. 测试策略

- 现有单元测试和 E2E 测试框架保持不变
- E2E 测试中的 `im-robot-harness.js` 需要适配：
  - 去掉 `setInterval` 拦截逻辑
  - 改为模拟 DOM 变化触发 Observer
  - 直接调用 `window.__robotCommands` 测试回复流程
- 新增 MutationObserver 相关测试用例
