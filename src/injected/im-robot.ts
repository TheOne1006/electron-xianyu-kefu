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

/** 注入脚本可调用的 Electron API（由 preload-browser.ts 注入） */
declare global {
  interface Window {
    __robotCommands?: RobotCommands
  }
}

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
    const target = this.findConversationListContainer()
    if (!target) {
      logger.warn('[Observer] 未找到会话列表容器，2 秒后重试')
      setTimeout(() => this.startObserver(), 2000)
      return
    }

    this.observer = new MutationObserver((mutations) => {
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
    const firstItem = document.querySelector('div[class*="conversation-item--"]')
    if (firstItem?.parentElement) {
      return firstItem.parentElement
    }

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

  /** 根据 itemId 查找匹配的会话项 */
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
    logger.info(`[状态机] PROCESSING_REPLY (${chatId}): ${replyText.substring(0, 30)}...`)

    await this.likeHumanClick(matchedChat.dom)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const inputEl = document.querySelector<HTMLTextAreaElement>('textarea.ant-input')
    if (!inputEl) {
      logger.error('[状态机] 未找到聊天输入框: textarea.ant-input')
      return
    }
    await this.likeHumanClick(inputEl)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const inputRect = inputEl.getBoundingClientRect()
    const inputX = inputRect.left + inputRect.width / 2
    const inputY = inputRect.top + inputRect.height / 2
    await window.electronAPI?.simulateChineseInput(replyText)
    await new Promise((resolve) => setTimeout(resolve, 2500))

    await window.electronAPI?.simulateEnterKey(inputX, inputY)
    logger.info('[状态机] 回复发送成功')
  }

  /** 兜底轮询中使用的 handleReply */
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
