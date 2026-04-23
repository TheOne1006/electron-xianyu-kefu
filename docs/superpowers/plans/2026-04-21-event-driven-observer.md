# 事件驱动架构改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ImRobot 从 10s setInterval 轮询改为 MutationObserver 事件驱动 + 主进程 executeJavaScript 主动推送指令

**Architecture:** 注入脚本用 MutationObserver 实时监听左侧会话列表 DOM 变化，debounce 后触发采集。主进程完成 Agent 处理后通过 `webContents.executeJavaScript()` 直接调用注入脚本注册的全局命令函数 `window.__robotCommands.sendReply()`，无需轮询。保留低频 30s 兜底轮询防止 Observer 失效。

**Tech Stack:** TypeScript 5.9.3, MutationObserver API, Electron BrowserWindow.webContents.executeJavaScript(), Vitest 4.1.2 (jsdom)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/injected/types.ts` | 新增 `RobotCommands`、`CommandResult` 类型 |
| Modify | `src/injected/im-robot.ts` | 核心改造：去掉 setInterval，新增 Observer + 命令注册 |
| Modify | `src/main/browser.ts` | 新增 `pushReplyToInjector()` 函数 |
| Modify | `src/main/business/agent.ts` | Agent 处理完成后调用 `pushReplyToInjector()` |
| Modify | `tests/e2e/harness/im-robot-harness.js` | 适配新的 Observer + 命令模式 |
| Modify | `tests/e2e/fixtures/mock-im.fixture.ts` | 更新 fixture 接口 |
| Create | `src/injected/__tests__/im-robot-observer.test.ts` | MutationObserver 相关单元测试 |

---

### Task 1: 新增类型定义

**Files:**
- Modify: `src/injected/types.ts`

- [ ] **Step 1: 在 types.ts 末尾添加新类型**

在 `src/injected/types.ts` 文件末尾（第 23 行 `export type AgentState = ...` 之后）添加：

```typescript
/** 主进程推送指令的结果 */
export interface CommandResult {
  success: boolean
  reason?: string
  state?: AgentState
}

/** 注入脚本暴露给主进程的命令接口 */
export interface RobotCommands {
  sendReply(chatId: string, replyText: string): Promise<CommandResult>
  getStatus(): { state: AgentState; lastActivity: number }
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/injected/types.ts
git commit -m "feat(injected): 新增 RobotCommands 和 CommandResult 类型定义"
```

---

### Task 2: 改造 ImRobot — 去掉 setInterval，新增 MutationObserver

**Files:**
- Modify: `src/injected/im-robot.ts`

这是核心改造任务。ImRobot 将从轮询驱动改为事件驱动：
- 去掉 `setInterval` tick 循环
- 新增 `MutationObserver` 监听左侧会话列表
- 新增 `window.__robotCommands` 全局命令注册
- 新增 `executeReply()` 方法供主进程直接调用
- 保留 30s 低频兜底轮询

- [ ] **Step 1: 重写 im-robot.ts**

将 `src/injected/im-robot.ts` 完整替换为以下内容：

```typescript
/**
 * IM 页面自动化机器人（事件驱动版）
 *
 * 状态机驱动：IDLE → PROCESSING_REPLY/PROCESSING_COLLECT → IDLE
 * 触发方式：
 *   - MutationObserver 实时监听左侧会话列表 DOM 变化
 *   - 主进程通过 executeJavaScript 调用 __robotCommands.sendReply() 主动推送
 *   - 30s 低频兜底轮询防止 Observer 失效
 */
import { createConsola } from 'consola/browser'
import type { ChatListItem, AgentState, CommandResult, RobotCommands } from './types'
import type { ChatInfo, Product } from '../shared/types'
import { PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH } from '../shared/constants'
import { ImDomExtractor } from './im-dom-extractor'

const logger = createConsola({ defaults: { tag: 'injected:im-robot' } })

export class ImRobot {
  state: AgentState = 'IDLE'
  lastActivity = Date.now()

  // 产品信息
  private products: Product[] = []
  private observer: MutationObserver | null = null
  private fallbackTimer: ReturnType<typeof setInterval> | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private currentWindowSnapshot = ''

  async start(): Promise<void> {
    // 初始化产品信息
    if (!this.products.length) {
      this.products = await this.getProducts()
    }

    // 启动 MutationObserver
    this.startObserver()

    // 启动低频兜底轮询（30s）
    this.fallbackTimer = setInterval(() => {
      this.fallbackCheck().catch((err) => {
        logger.error('[兜底轮询] 出错:', err)
      })
    }, 30 * 1000)

    // 注册全局命令接口
    this.registerCommands()

    logger.info('[状态机] 处理器已启动 (Observer + 30s 兜底)')
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer)
      this.fallbackTimer = null
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    logger.info('[状态机] 处理器已停止')
  }

  /** 获取产品列表 */
  private async getProducts(): Promise<Product[]> {
    try {
      const result = await window.electronAPI?.product.list()
      if (result && result.code === 0 && result.data) {
        return result.data
      } else {
        return []
      }
    } catch (err) {
      logger.error('[状态机] 获取产品列表失败:', err)
      return []
    }
  }

  /** 启动 MutationObserver 监听左侧会话列表 */
  private startObserver(): void {
    // 查找左侧会话列表容器
    const target = this.findConversationListContainer()
    if (!target) {
      logger.warn('[Observer] 未找到会话列表容器，2 秒后重试')
      setTimeout(() => this.startObserver(), 2000)
      return
    }

    this.observer = new MutationObserver((mutations) => {
      // 检查是否有实质性变化（忽略纯 class 变化）
      const hasSignificantChange = mutations.some((m) => {
        if (m.type === 'childList') return true
        if (m.type === 'characterData') return true
        return false
      })
      if (!hasSignificantChange) return

      this.onDomChange()
    })

    this.observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    })

    logger.info('[Observer] 已启动监听会话列表')
  }

  /** 查找左侧会话列表容器 */
  private findConversationListContainer(): Element | null {
    // 策略 1: 通过 conversation-item 的共同父容器查找
    const firstItem = document.querySelector('div[class*="conversation-item--"]')
    if (firstItem?.parentElement) {
      return firstItem.parentElement
    }

    // 策略 2: 通过常见容器 class 查找
    const container = document.querySelector('div[class*="conversation-list"]')
    if (container) return container

    return null
  }

  /** DOM 变化回调（debounce 300ms） */
  private onDomChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      this.handleDomChange().catch((err) => {
        logger.error('[Observer] 处理 DOM 变化出错:', err)
      })
    }, 300)
  }

  /** 处理检测到的 DOM 变化 */
  private async handleDomChange(): Promise<void> {
    if (this.state !== 'IDLE') {
      logger.info(`[Observer] 当前状态 ${this.state}，跳过本次变化`)
      return
    }

    logger.info('[Observer] 检测到会话列表变化')
    this.lastActivity = Date.now()

    const chatList = ImDomExtractor.getChatList()
    const hasUnread = ImDomExtractor.hasUnreadMessages()
    const firstUnread = hasUnread ? chatList.find((c) => c.hasUnread) : undefined

    if (firstUnread) {
      if (firstUnread.type === 'system') {
        logger.info(`[Observer] 处理系统消息: ${firstUnread.userName || firstUnread.lastMessage}`)
        await this.likeHumanClick(firstUnread.dom)
        this.cleanup()
        return
      } else {
        await this.likeHumanClick(firstUnread.dom)
        await new Promise((resolve) => setTimeout(resolve, 1500))
        await this.handleCollectDirect()
        this.cleanup()
        return
      }
    }

    // 检查当前窗口快照 diff
    const snapshot = ImDomExtractor.getCurrentWindowSnapshot()
    if (snapshot.isChatOpen) {
      const isMyProduct = this.products.some((p) => p.id === snapshot.itemId)
      if (isMyProduct) {
        const fingerprint = JSON.stringify({
          userName: snapshot.userName,
          itemId: snapshot.itemId,
          lastUserMessage: snapshot.lastUserMessage
        })
        if (fingerprint !== this.currentWindowSnapshot) {
          logger.info(
            `[Observer] 当前窗口新消息: ${snapshot.userName}: ${snapshot.lastUserMessage.substring(0, 30)}...`
          )
          this.state = 'PROCESSING_COLLECT'
          await this.handleCollectDirect()
          this.currentWindowSnapshot = fingerprint
          this.cleanup()
          return
        }
      }
    }

    logger.info('[Observer] 无需处理的变化')
  }

  /** 30s 兜底轮询检查（防止 Observer 失效） */
  private async fallbackCheck(): Promise<void> {
    if (this.state !== 'IDLE') return

    // 先检查回复队列
    const reply = await this.fetchPendingReply()
    if (reply) {
      const chatList = ImDomExtractor.getChatList()
      const matchedChat = this.findMatchingChatItem(chatList, reply.chatInfo.itemId)
      if (matchedChat) {
        this.state = 'PROCESSING_REPLY'
        await this.handleReply(reply, matchedChat)
        this.cleanup()
        return
      }
    }

    // 检查未读
    const hasUnread = ImDomExtractor.hasUnreadMessages()
    if (hasUnread) {
      logger.info('[兜底轮询] 检测到未读消息（Observer 可能未触发）')
      await this.handleDomChange()
    }
  }

  /** 注册全局命令接口（供主进程通过 executeJavaScript 调用） */
  private registerCommands(): void {
    const self = this

    const commands: RobotCommands = {
      async sendReply(chatId: string, replyText: string): Promise<CommandResult> {
        if (self.state !== 'IDLE') {
          return { success: false, reason: 'busy', state: self.state }
        }

        self.state = 'PROCESSING_REPLY'
        self.lastActivity = Date.now()

        try {
          // 获取对话数据
          const chatInfo = await self.getChatInfoById(chatId)
          if (!chatInfo) {
            self.state = 'IDLE'
            return { success: false, reason: 'chat_not_found' }
          }

          const chatList = ImDomExtractor.getChatList()
          const matchedChat = self.findMatchingChatItem(chatList, chatInfo.itemId)
          if (!matchedChat) {
            self.state = 'IDLE'
            return { success: false, reason: 'chat_item_not_found' }
          }

          await self.executeReply(chatId, replyText, matchedChat)
          self.cleanup()
          return { success: true }
        } catch (err) {
          logger.error('[命令] sendReply 执行失败:', err)
          self.state = 'IDLE'
          return { success: false, reason: 'execution_error' }
        }
      },

      getStatus() {
        return { state: self.state, lastActivity: self.lastActivity }
      }
    }

    window.__robotCommands = commands
    logger.info('[命令] 全局命令接口已注册')
  }

  /** 通过 chatId 获取 chatInfo */
  private async getChatInfoById(chatId: string): Promise<ChatInfo | null> {
    try {
      if (!window.electronAPI) return null
      const result = await window.electronAPI.conversation.getById(chatId)
      if (result.code !== 0 || !result.data) return null
      return result.data.chatInfo
    } catch {
      return null
    }
  }

  /** 拉取回复队列（兜底轮询使用） */
  private async fetchPendingReply(): Promise<{ chatInfo: ChatInfo; replyText: string } | null> {
    try {
      if (!window.electronAPI) return null

      const queueResult = await window.electronAPI.replyQueue.dequeue()
      if (queueResult.code !== 0 || !queueResult.data.chatId) return null

      const chatId = queueResult.data.chatId
      const result = await window.electronAPI.conversation.getById(chatId)
      if (result.code !== 0 || !result.data) return null

      const packet = result.data
      const messages = packet.messages
      if (messages.length === 0) return null

      const lastMsg = messages[messages.length - 1]
      if (!lastMsg.isSelf || !lastMsg.content) return null

      return { chatInfo: packet.chatInfo, replyText: lastMsg.content }
    } catch (err) {
      logger.error('[状态机] 获取待发回复失败:', err)
      return null
    }
  }

  /** 模拟人类点击元素 */
  private async likeHumanClick(element: Element): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 500 + 500))
    const { left, top, width, height } = element.getBoundingClientRect()
    const cx = left + width / 2
    const cy = top + height / 2
    const offsetX = (Math.random() - 0.5) * 0.3 * width
    const offsetY = (Math.random() - 0.5) * 0.2 * height
    window.electronAPI?.simulateClick(cx + offsetX, cy + offsetY)
  }

  /**
   * 根据 itemId 和 products 列表查找匹配的会话项
   */
  private findMatchingChatItem(chatList: ChatListItem[], itemId: string): ChatListItem | null {
    const matchedProduct = this.products.find((p) => {
      if (!p.mainImageUrl) return false
      return p.id === itemId
    })

    if (!matchedProduct) {
      logger.warn(`[状态机] 未找到匹配的产品: itemId=${itemId}`)
      return null
    }

    const productImagePrefix = matchedProduct.mainImageUrl.substring(
      0,
      PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH
    )

    const matchedChat = chatList.find((c) => {
      return c.itemImage.startsWith(productImagePrefix)
    })

    if (!matchedChat) {
      logger.warn(`[状态机] 未找到匹配的会话项: itemId=${itemId}`)
      return null
    }

    logger.info(`[状态机] 匹配成功: ${matchedChat.userName}, itemId=${itemId}`)
    return matchedChat
  }

  /** 执行回复发送（由主进程直接调用或兜底轮询调用） */
  private async executeReply(
    chatId: string,
    replyText: string,
    matchedChat: ChatListItem
  ): Promise<void> {
    logger.info(`[状态机] PROCESSING_REPLY: ${replyText.substring(0, 30)}...`)

    // 点击会话项进入聊天窗口
    await this.likeHumanClick(matchedChat.dom)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // 点击输入框获取焦点
    const inputEl = document.querySelector<HTMLTextAreaElement>('textarea.ant-input')
    if (!inputEl) {
      logger.error('[状态机] 未找到聊天输入框: textarea.ant-input')
      return
    }
    await this.likeHumanClick(inputEl)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // 模拟中文输入
    const inputRect = inputEl.getBoundingClientRect()
    const inputX = inputRect.left + inputRect.width / 2
    const inputY = inputRect.top + inputRect.height / 2
    await window.electronAPI?.simulateChineseInput(replyText)
    await new Promise((resolve) => setTimeout(resolve, 2500))

    // 模拟 Enter 键发送
    await window.electronAPI?.simulateEnterKey(inputX, inputY)
    logger.info(`[状态机] 回复发送成功`)
  }

  /** 兜底轮询中使用的 handleReply（从回复队列拉取数据后调用） */
  private async handleReply(
    reply: { chatInfo: ChatInfo; replyText: string },
    matchedChat: ChatListItem
  ): Promise<void> {
    await this.executeReply('', reply.replyText, matchedChat)
  }

  /** 纯采集：提取当前聊天数据并通过 IPC 推送给主进程 */
  private async handleCollectDirect(): Promise<void> {
    const chatInfo = ImDomExtractor.getCurrentChatInfo()
    const messages = ImDomExtractor.getChatMessages()

    if (window.electronAPI) {
      await window.electronAPI.conversation.upsert(
        {
          userName: chatInfo.userName,
          itemId: chatInfo.itemId,
          isMyProduct: chatInfo.isMyProduct
        },
        messages
      )
      logger.info(`[状态机] 已推送用户消息: ${chatInfo.userName} (${messages.length} 条消息)`)
    } else {
      logger.warn('[状态机] electronAPI 不可用,无法推送消息')
    }
  }

  /** CLEANUP: 重置状态 */
  private cleanup(): void {
    logger.info('[状态机] CLEANUP → IDLE')
    this.state = 'IDLE'
    this.lastActivity = Date.now()
  }
}
```

- [ ] **Step 2: 在 shared/types.ts 末尾添加 RobotCommands 类型**

注入脚本的 `RobotCommands` 和 `CommandResult` 定义在 `src/injected/types.ts`（Task 1 已完成），但主进程也需要了解命令接口的结构（用于 `browser.ts` 中的 `pushReplyToInjector` 返回值类型推断）。

在 `src/shared/types.ts` 文件末尾（第 178 行之后）添加：

```typescript

// ============================================================
// J. 注入脚本全局命令接口 — 主进程通过 executeJavaScript 调用
// ============================================================

/** 主进程推送指令到注入脚本的命令接口 */
export interface RobotCommands {
  sendReply(chatId: string, replyText: string): Promise<{
    success: boolean
    reason?: string
    state?: string
  }>
  getStatus(): { state: string; lastActivity: number }
}
```

注意：注入脚本编译为 IIFE 格式运行在浏览器环境，`window.__robotCommands` 的赋值不需要 TypeScript 的 Window 接口扩展。主进程通过 `executeJavaScript()` 以字符串形式调用，也不需要类型导入。

- [ ] **Step 3: 验证类型检查通过**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 4: 构建注入脚本**

Run: `pnpm build:injected`
Expected: 构建成功，输出 `resources/injected.bundle.js`

- [ ] **Step 5: 运行现有测试确保不破坏**

Run: `pnpm test`
Expected: 所有现有测试通过

- [ ] **Step 6: Commit**

```bash
git add src/injected/im-robot.ts src/injected/types.ts src/shared/types.ts
git commit -m "feat(injected): ImRobot 改为 MutationObserver 事件驱动 + 命令注册"
```

---

### Task 3: 主进程新增 pushReplyToInjector 推送函数

**Files:**
- Modify: `src/main/browser.ts`

- [ ] **Step 1: 在 browser.ts 中新增 pushReplyToInjector 函数**

在 `src/main/browser.ts` 文件末尾（第 126 行 `isXYBrowserRunning` 函数之后）添加：

```typescript
/**
 * 向注入脚本推送回复指令
 *
 * 通过 webContents.executeJavaScript() 调用注入脚本中注册的 __robotCommands.sendReply()。
 * 如果注入脚本忙（返回 success: false），回退到 reply-queue 入队。
 */
export async function pushReplyToInjector(chatId: string, replyText: string): Promise<boolean> {
  const bw = getBrowserWindow()
  if (!bw || bw.isDestroyed()) {
    logger.warn('[推送] 浏览器窗口不存在')
    return false
  }

  try {
    const safeChatId = chatId.replace(/'/g, "\\'")
    const safeReplyText = JSON.stringify(replyText)

    const result = await bw.webContents.executeJavaScript(
      `window.__robotCommands?.sendReply('${safeChatId}', ${safeReplyText})`
    )

    if (result?.success) {
      logger.info(`[推送] 回复已直接推送: ${chatId}`)
      return true
    }

    logger.info(`[推送] 注入脚本忙 (${result?.reason || 'unknown'})，将回退到队列`)
    return false
  } catch (err) {
    logger.warn(`[推送] executeJavaScript 失败: ${err}`)
    return false
  }
}
```

同时在文件顶部添加 logger（如果没有的话）。检查现有代码发现没有模块级 logger，需要在 `closeXYBrowserWindow` 之前添加：

在文件顶部的 import 区域后面添加：

```typescript
import { consola } from 'consola'

const logger = consola.withTag('browser')
```

- [ ] **Step 2: 验证类型检查通过**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/main/browser.ts
git commit -m "feat(main): 新增 pushReplyToInjector 向注入脚本推送回复指令"
```

---

### Task 4: Agent 处理完成后主动推送回复

**Files:**
- Modify: `src/main/business/agent.ts`

- [ ] **Step 1: 修改 agent.ts，在 enqueue 后尝试主动推送**

在 `src/main/business/agent.ts` 中：

1. 在文件顶部 import 区域（第 12 行之后）添加：

```typescript
import { pushReplyToInjector } from '../browser'
```

2. 将第 91-92 行的：

```typescript
    // ── 8. 存入待发队列（供注入层轮询获取） ────────────────────────────────
    enqueue(chatId)
```

替换为：

```typescript
    // ── 8. 尝试主动推送回复到注入脚本 ────────────────────────────────
    const pushed = await pushReplyToInjector(chatId, replyText)
    if (!pushed) {
      // 推送失败（注入脚本忙或窗口不存在），回退到队列
      enqueue(chatId)
    }
```

- [ ] **Step 2: 验证类型检查通过**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 3: 运行 lint**

Run: `pnpm lint`
Expected: 无 lint 错误

- [ ] **Step 4: Commit**

```bash
git add src/main/business/agent.ts
git commit -m "feat(agent): Agent 处理完成后主动推送回复到注入脚本"
```

---

### Task 5: 新增 ImRobot Observer 单元测试

**Files:**
- Create: `src/injected/__tests__/im-robot-observer.test.ts`

- [ ] **Step 1: 编写 Observer 相关单元测试**

创建 `src/injected/__tests__/im-robot-observer.test.ts`：

```typescript
/**
 * ImRobot MutationObserver 相关单元测试
 *
 * 测试 Observer 监听、debounce、状态机事件驱动逻辑。
 * 使用 jsdom 构造 DOM 环境。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'

// Mock electronAPI
const mockElectronAPI = {
  simulateClick: vi.fn().mockResolvedValue({ code: 0, message: '', data: { success: true } }),
  simulateChineseInput: vi.fn().mockResolvedValue({ code: 0, message: '', data: { success: true } }),
  simulateEnterKey: vi.fn().mockResolvedValue({ code: 0, message: '', data: { success: true } }),
  replyQueue: {
    dequeue: vi.fn().mockResolvedValue({ code: 1, message: 'empty', data: { chatId: null } })
  },
  conversation: {
    upsert: vi.fn().mockResolvedValue({ code: 0, message: '', data: null }),
    getById: vi.fn().mockResolvedValue({ code: 1, message: 'not found', data: null })
  },
  product: {
    list: vi.fn().mockResolvedValue({
      code: 0,
      message: '',
      data: [
        {
          id: '100001',
          title: 'iPhone 15',
          mainImageUrl: 'https://img.example.com/iphone15.jpg',
          images: [],
          documentKeys: []
        }
      ]
    })
  }
}

function setupDOM(html: string, url = 'https://www.goofish.com/im'): void {
  const dom = new JSDOM(html, { url })
  globalThis.document = dom.window.document
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.MutationObserver = dom.window.MutationObserver as unknown as typeof MutationObserver
  ;(globalThis.window as Record<string, unknown>).electronAPI = mockElectronAPI
}

function teardownDOM(): void {
  delete (globalThis as Record<string, unknown>).document
  delete (globalThis as Record<string, unknown>).window
  delete (globalThis as Record<string, unknown>).MutationObserver
}

describe('ImRobot Observer 模式', () => {
  beforeEach(() => {
    teardownDOM()
    vi.clearAllMocks()
  })

  afterEach(() => {
    teardownDOM()
  })

  it('启动时注册全局命令接口', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    expect((globalThis.window as Record<string, unknown>).__robotCommands).toBeDefined()
    expect(
      typeof (globalThis.window as Record<string, unknown>).__robotCommands === 'object'
    ).toBe(true)

    robot.stop()
  })

  it('getStatus 返回当前状态', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    const commands = (globalThis.window as Record<string, unknown>).__robotCommands as {
      getStatus: () => { state: string; lastActivity: number }
    }
    const status = commands.getStatus()
    expect(status.state).toBe('IDLE')
    expect(status.lastActivity).toBeGreaterThan(0)

    robot.stop()
  })

  it('sendReply 在非 IDLE 状态时返回 busy', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    // 模拟忙碌状态
    robot.state = 'PROCESSING_COLLECT'

    const commands = (globalThis.window as Record<string, unknown>).__robotCommands as {
      sendReply: (chatId: string, text: string) => Promise<{ success: boolean; reason?: string }>
    }
    const result = await commands.sendReply('test-chat-id', '测试回复')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('busy')

    robot.stop()
  })

  it('sendReply 在 chatInfo 不存在时返回 chat_not_found', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    mockElectronAPI.conversation.getById.mockResolvedValueOnce({
      code: 1,
      message: 'not found',
      data: null
    })

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    const commands = (globalThis.window as Record<string, unknown>).__robotCommands as {
      sendReply: (chatId: string, text: string) => Promise<{ success: boolean; reason?: string }>
    }
    const result = await commands.sendReply('nonexistent-chat', '测试回复')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('chat_not_found')

    robot.stop()
  })

  it('启动时创建 MutationObserver', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    // Observer 应该已创建并开始监听
    expect(robot['observer']).not.toBeNull()

    robot.stop()
  })

  it('stop 时断开 Observer 并清理定时器', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    robot.stop()

    expect(robot['observer']).toBeNull()
    expect(robot['fallbackTimer']).toBeNull()
    expect(robot['debounceTimer']).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `pnpm test src/injected/__tests__/im-robot-observer.test.ts`
Expected: 所有测试通过

- [ ] **Step 3: Commit**

```bash
git add src/injected/__tests__/im-robot-observer.test.ts
git commit -m "test(injected): 新增 ImRobot Observer 模式单元测试"
```

---

### Task 6: 适配 E2E 测试 Harness

**Files:**
- Modify: `tests/e2e/harness/im-robot-harness.js`
- Modify: `tests/e2e/fixtures/mock-im.fixture.ts`

- [ ] **Step 1: 重写 im-robot-harness.js**

将 `tests/e2e/harness/im-robot-harness.js` 替换为：

```javascript
/**
 * E2E 测试 Harness — Observer + 命令模式适配
 *
 * 此脚本必须在 injected.bundle.js 注入之前执行。
 * 适配新的 ImRobot 架构：
 *   - 不再需要拦截 setInterval
 *   - 暴露 DOM 变化触发接口
 *   - 暴露命令调用接口
 *
 * 使用方式（在 fixture 中按顺序执行）：
 *   1. history.pushState → 设置 pathname
 *   2. 执行本 harness 代码 → 暴露测试 API
 *   3. 注入 injected.bundle.js → ImRobot start() 注册 __robotCommands
 *   4. 通过 __testRobot 触发操作
 */
;(function () {
  // 暴露测试 API
  window.__testRobot = {
    /** 触发 DOM 变化（模拟 Observer 检测到的变化） */
    triggerDomChange() {
      // 通过修改会话列表触发 Observer
      const container = document.querySelector('div[class*="conversation-list"]')
        || document.querySelector('div[class*="conversation-item--"]')?.parentElement
      if (container) {
        // 添加一个临时元素触发 childList 变化
        const temp = document.createElement('div')
        temp.setAttribute('data-test-trigger', 'true')
        container.appendChild(temp)
        container.removeChild(temp)
      }
    },

    /** 直接调用 sendReply 命令 */
    async sendReply(chatId, replyText) {
      if (window.__robotCommands) {
        return await window.__robotCommands.sendReply(chatId, replyText)
      }
      return { success: false, reason: 'commands_not_registered' }
    },

    /** 获取机器人状态 */
    getStatus() {
      if (window.__robotCommands) {
        return window.__robotCommands.getStatus()
      }
      return { state: 'unknown', lastActivity: 0 }
    },

    /** 获取 mockCallLog */
    getCallLog() {
      return window.__mockCallLog || []
    },

    /** 清空 callLog */
    clearCallLog() {
      if (window.__mockCallLog) {
        window.__mockCallLog.length = 0
      }
    },

    /** 获取 MockIM */
    get mockIM() {
      return window.MockIM
    }
  }

  window.__testHarness = true
})()
```

- [ ] **Step 2: 更新 mock-im.fixture.ts**

将 `tests/e2e/fixtures/mock-im.fixture.ts` 中的 `triggerTick` 相关代码更新。

在 `MockIMPage` 接口（第 24-31 行）中，将 `triggerTick` 改为 `triggerDomChange` 和 `sendReply`：

替换接口定义：

```typescript
export interface MockIMPage {
  win: BrowserWindow
  evaluate: <T>(js: string) => Promise<T>
  getCallLog: () => Promise<CallLogEntry[]>
  clearCallLog: () => Promise<void>
  triggerDomChange: () => Promise<void>
  sendReply: (chatId: string, replyText: string) => Promise<{ success: boolean; reason?: string }>
  cleanup: () => void
}
```

在 `createMockIMPage` 函数中（第 78-80 行），将 `triggerTick` 替换为新的方法：

```typescript
  const triggerDomChange = async (): Promise<void> => {
    await evaluate('window.__testRobot.triggerDomChange()')
  }

  const sendReply = async (chatId: string, replyText: string): Promise<{ success: boolean; reason?: string }> => {
    return evaluate(`window.__testRobot.sendReply('${chatId}', ${JSON.stringify(replyText)})`)
  }
```

更新 return 对象：

```typescript
  return {
    win,
    evaluate,
    getCallLog,
    clearCallLog,
    triggerDomChange,
    sendReply,
    cleanup
  }
```

- [ ] **Step 3: 运行 lint**

Run: `pnpm lint`
Expected: 无 lint 错误

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/harness/im-robot-harness.js tests/e2e/fixtures/mock-im.fixture.ts
git commit -m "refactor(e2e): 适配 ImRobot Observer + 命令模式的测试 harness"
```

---

### Task 7: 完整构建验证

**Files:**
- 无新文件

- [ ] **Step 1: 完整构建**

Run: `pnpm build`
Expected: 构建成功

- [ ] **Step 2: 运行全部测试**

Run: `pnpm test`
Expected: 所有测试通过

- [ ] **Step 3: 运行类型检查**

Run: `pnpm typecheck`
Expected: 无类型错误

- [ ] **Step 4: 运行 lint**

Run: `pnpm lint`
Expected: 无 lint 错误

- [ ] **Step 5: 构建注入脚本**

Run: `pnpm build:injected`
Expected: 构建成功

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: 事件驱动架构改造完成 — MutationObserver + executeJavaScript 推送"
```
