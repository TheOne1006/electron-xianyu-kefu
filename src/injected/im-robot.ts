/**
 * IM 页面自动化机器人
 *
 * 状态机驱动：IDLE → CHECKING → PROCESSING_REPLY/PROCESSING_COLLECT → CLEANUP → IDLE
 * 每 10 秒 tick 一次：
 *   1. 优先拉取回复队列，有则 PROCESSING_REPLY
 *   2. 其次检测未读消息，有则 PROCESSING_COLLECT 或清除系统消息标记
 */
import { createConsola } from 'consola/browser'
import type { ChatListItem, AgentState } from './types'
import type { ChatInfo, Product } from '../shared/types'
import { PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH } from '../shared/constants'
import { ImDomExtractor } from './im-dom-extractor'

const logger = createConsola({ defaults: { tag: 'injected:im-robot' } })

export class ImRobot {
  state: AgentState = 'IDLE'

  // 产品信息
  private products: Product[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private currentWindowSnapshot = ''

  async start(): Promise<void> {
    if (this.timer) {
      logger.warn('[状态机] 处理器已在运行中')
      return
    }
    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        logger.error('[状态机] tick 出错:', err)
        this.state = 'IDLE'
      })
    }, 10 * 1000)

    // 初始化产品信息
    if (!this.products.length) {
      this.products = await this.getProducs()
    }

    logger.info('[状态机] 处理器已启动 (间隔 10s)')
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      logger.info('[状态机] 处理器已停止')
    }
  }

  /** 获取产品列表 */
  private async getProducs(): Promise<Product[]> {
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

  private async tick(): Promise<void> {
    if (this.state !== 'IDLE') {
      logger.info(`[状态机] 当前状态 ${this.state}，跳过本次 tick`)
      return
    }

    // ─── CHECKING ───────────────────────────────────────
    logger.info('[状态机] IDLE → CHECKING')
    this.state = 'CHECKING'

    // 获取聊天会话列表
    const chatList = ImDomExtractor.getChatList()

    // Step 1: 拉取回复队列（优先）
    const reply = await this.fetchPendingReply()
    if (reply) {
      // 找到匹配的会话项
      const matchedChat = this.findMatchingChatItem(chatList, reply.chatInfo.itemId)
      if (!matchedChat) {
        logger.warn(`[状态机] 未找到匹配的会话项: itemId=${reply.chatInfo.itemId}`)
        return
      }

      await this.handleReply(reply, matchedChat)
      this.cleanup()
      return
    }

    // Step 2: 检测未读
    const hasUnread = ImDomExtractor.hasUnreadMessages()
    const firstUnread = hasUnread ? chatList.find((c) => c.hasUnread) : undefined

    if (firstUnread) {
      // 分支：系统消息 vs 用户消息
      if (firstUnread.type === 'system') {
        logger.info(`[状态机] 处理系统消息: ${firstUnread.userName || firstUnread.lastMessage}`)
        await this.likeHumanClick(firstUnread.dom)
        this.cleanup()
        return
      } else {
        // 点击导航到聊天窗口
        await this.likeHumanClick(firstUnread.dom)
        await new Promise((resolve) => setTimeout(resolve, 1500))
        await this.handleCollectDirect()
        this.cleanup()
        return
      }
    }

    // Step 3: 当前窗口快照 diff（检测已打开聊天中的新消息）
    const snapshot = ImDomExtractor.getCurrentWindowSnapshot()
    if (!snapshot.isChatOpen) {
      logger.info('[状态机] CHECKING → IDLE (当前无聊天窗口)')
      this.state = 'IDLE'
      return
    }

    // 判断是否是我的商品
    const isMyProduct = this.products.some((p) => p.id === snapshot.itemId)
    if (!isMyProduct) {
      logger.info(`[状态机] CHECKING → IDLE (非我的商品: ${snapshot.itemId})`)
      this.state = 'IDLE'
      return
    }

    const fingerprint = JSON.stringify({
      userName: snapshot.userName,
      itemId: snapshot.itemId,
      lastUserMessage: snapshot.lastUserMessage
    })

    if (fingerprint === this.currentWindowSnapshot) {
      logger.info('[状态机] CHECKING → IDLE (当前窗口无变化)')
      this.state = 'IDLE'
      return
    }

    // 指纹变化 → 采集新消息
    logger.info(
      `[状态机] CHECKING → PROCESSING_COLLECT (当前窗口新消息: ${snapshot.userName}: ${snapshot.lastUserMessage.substring(0, 30)}...)`
    )
    this.state = 'PROCESSING_COLLECT'
    await this.handleCollectDirect()
    this.currentWindowSnapshot = fingerprint
    this.cleanup()
  }

  /** 模拟人类点击元素 */
  private async likeHumanClick(element: Element): Promise<void> {
    // 随机 500 - 1000ms 点击
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 500 + 500))
    // 找到 元素中心
    const { left, top, width, height } = element.getBoundingClientRect()
    const cx = left + width / 2
    const cy = top + height / 2
    // 随机 +- 30% 的偏移
    const offsetX = (Math.random() - 0.5) * 0.3 * width
    const offsetY = (Math.random() - 0.5) * 0.2 * height

    // 模拟点击
    window.electronAPI?.simulateClick(cx + offsetX, cy + offsetY)
  }

  /**
   * 根据 itemId 和 products 列表查找匹配的会话项
   * 匹配逻辑：通过 products 中商品缩略图前72字符匹配获取 itemId，再在 chatList 中查找对应项
   */
  private findMatchingChatItem(chatList: ChatListItem[], itemId: string): ChatListItem | null {
    // 在 products 中查找缩略图前72字符匹配的商品
    const matchedProduct: Product | undefined = this.products.find((p) => {
      if (!p.mainImageUrl) return false
      return p.id === itemId
    })

    if (!matchedProduct) {
      logger.warn(`[状态机] 未找到匹配的产品: itemId=${itemId}`)
      return null
    }

    // 在 chatList 中的 itemImage 的前 PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH 72 字符匹配的商品
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

  /** 拉取回复队列 */
  private async fetchPendingReply(): Promise<{ chatInfo: ChatInfo; replyText: string } | null> {
    try {
      if (!window.electronAPI) {
        logger.warn('[状态机] electronAPI 不可用')
        return null
      }

      logger.info('[状态机] 拉取回复队列......')
      // dequeue 返回被移除的 chatId
      const queueResult = await window.electronAPI.replyQueue.dequeue()

      if (queueResult.code !== 0 || !queueResult.data.chatId) {
        logger.warn(`[状态机] 回复队列为空: ${queueResult.message}`)
        return null
      }

      const chatId = queueResult.data.chatId

      logger.info(`[状态机] 拉取回复队列成功: ${chatId}`)

      // 通过 chatId 获取对话数据
      const result = await window.electronAPI.conversation.getById(chatId)
      if (result.code !== 0 || !result.data) {
        logger.warn(`[状态机] 对话不存在: ${chatId}`)
        return null
      }

      const packet = result.data
      const messages = packet.messages
      if (messages.length === 0) {
        logger.warn(`[状态机] 对话消息为空: ${chatId}`)
        return null
      }

      const lastMsg = messages[messages.length - 1]
      if (!lastMsg.isSelf || !lastMsg.content) {
        logger.warn(`[状态机] 最后一条消息不是用户发送的文本消息: ${chatId}`)
        return null
      }

      logger.info(`[状态机] 拉取回复队列成功: ${chatId}, 最后一条消息: ${lastMsg.content}`)

      return {
        chatInfo: packet.chatInfo,
        replyText: lastMsg.content
      }
    } catch (err) {
      logger.error('[状态机] 获取待发回复失败:', err)
      return null
    }
  }

  /** PROCESSING_REPLY: 导航到目标会话并发送 AI 回复 */
  private async handleReply(
    reply: { chatInfo: ChatInfo; replyText: string },
    matchedChat: ChatListItem
  ): Promise<void> {
    logger.info(
      `[状态机] CHECKING → PROCESSING_REPLY (${reply.chatInfo.userName}: ${reply.replyText.substring(0, 30)}...)`
    )
    this.state = 'PROCESSING_REPLY'

    try {
      // Step 2: 点击会话项进入聊天窗口
      await this.likeHumanClick(matchedChat.dom)

      // Step 3: 等待页面切换
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Step 4: 点击输入框获取焦点
      const inputEl = document.querySelector<HTMLTextAreaElement>('textarea.ant-input')
      if (!inputEl) {
        logger.error(`[状态机] 未找到聊天输入框: textarea.ant-input`)
        return
      }
      await this.likeHumanClick(inputEl)

      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Step 5: 获取输入框坐标并模拟输入文本（过滤思考标签）
      const inputRect = inputEl.getBoundingClientRect()
      const inputX = inputRect.left + inputRect.width / 2
      const inputY = inputRect.top + inputRect.height / 2
      await window.electronAPI?.simulateChineseInput(reply.replyText)

      await new Promise((resolve) => setTimeout(resolve, 2500))

      // Step 6: 模拟 Enter 键发送消息
      await window.electronAPI?.simulateEnterKey(inputX, inputY)

      // 注意：dequeue 已在 fetchPendingReply 中完成，无需再次调用
      logger.info(`[状态机] 回复发送成功: ${reply.chatInfo.userName}`)
    } catch (err) {
      logger.error(`[状态机] 回复发送失败: ${err}`)
      throw err
    }
  }

  /** 纯采集：提取当前聊天数据并通过 IPC 推送给主进程（不含导航） */
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

  /** CLEANUP: 清空历史、重置面板、回到 IDLE */
  private cleanup(): void {
    // TODO: [STEP-4] 移除 history 管理: this.agent.history = []
    // TODO: [STEP-5] 移除 panel.reset 调用: this.agent.panel.reset()
    logger.info('[状态机] CLEANUP → IDLE')
    this.state = 'IDLE'
  }
}
