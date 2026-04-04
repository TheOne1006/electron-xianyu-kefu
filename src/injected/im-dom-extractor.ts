/**
 * ImDomExtractor — 闲鱼 IM 页面 DOM 提取静态工具类
 *
 * 从 im-helpers/index.ts 重构而来，提供 4 个静态方法：
 * - getCurrentChatInfo(): 提取当前聊天会话信息
 * - hasUnreadMessages(): 检测当前会话是否有未读消息
 * - getChatMessages(): 提取当前聊天的消息列表
 * - getChatList(): 提取左侧会话列表
 *
 * 设计要点：
 * - 纯静态类，不挂载到 window，由调用方按需使用
 * - 删除 allowWrap 路径校验（由 index.ts 路由层保证）
 * - 保留所有 DOM 选择器逻辑与原始实现一致
 */
import type { ChatInfo, ChatMessage } from '../shared/types'
import type { ChatListItem } from './types'

export class ImDomExtractor {
  /**
   * 提取当前聊天会话的基本信息
   *
   * 从聊天头部区域提取用户名和关联商品 ID。
   * 商品 ID 通过页面中的商品链接（/item?id= 或 itemId=）解析。
   */
  static getCurrentChatInfo(): ChatInfo {
    const userNameEl = document.querySelector('span[class*="text1--"]')
    const userName = userNameEl ? userNameEl.textContent?.trim() || '' : ''

    const itemLink = document.querySelector<HTMLAnchorElement>(
      'a[href*="/item?id="], a[href*="itemId="]'
    )
    let itemId = ''

    if (itemLink?.href) {
      const match = itemLink.href.match(/itemId=(\d+)/) || itemLink.href.match(/item\?id=(\d+)/)
      itemId = match ? (match[1] ?? '') : ''
    }

    return {
      userName,
      itemId,
      isMyProduct: false
    }
  }

  /**
   * 检测当前会话是否有未读消息
   *
   * 通过 conv-header 区域中的 badge 元素判断：
   * - 先检查 badge 的 title 属性（如 title="3"）
   * - 再检查 badge 的文本内容（如 "2"）
   * - 数字 >= 1 视为有未读
   */
  static hasUnreadMessages(): boolean {
    const headerEl = document.querySelector('div[class*="conv-header--"]')
    if (!headerEl) {
      return false
    }

    const badgeEl = headerEl.querySelector('.ant-scroll-number, sup.ant-badge-count')
    if (!badgeEl) {
      return false
    }

    const title = badgeEl.getAttribute('title')
    if (title) {
      const num = parseInt(title, 10)
      return !isNaN(num) && num >= 1
    }

    const text = badgeEl.textContent?.trim() || ''
    const match = text.match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      return num >= 1
    }

    return false
  }

  /**
   * 提取当前聊天页面的消息列表
   *
   * 解析消息列表中的每条消息，支持三种类型：
   * - text: 纯文本消息
   * - image: 图片消息（排除 avatar 图片）
   * - card: 商品卡片消息
   *
   * 通过 avatar 元素在 flex 容器中的位置判断消息方向：
   * - 对方消息：avatar 是第一个子元素
   * - 我的消息：avatar 是最后一个子元素
   */
  static getChatMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    const list = document.querySelector('ul.ant-list-items')
    if (!list) {
      return messages
    }

    const items = list.querySelectorAll('li.ant-list-item')
    items.forEach((li) => {
      const messageRow = li.querySelector('[class*="message-row--"]')
      const avatarEl = messageRow ? messageRow.querySelector('[class*="avatar--"]') : null

      // 通过 avatar 元素位置判断消息方向
      const avatarParent = avatarEl?.parentElement
      const isSelf = avatarParent ? avatarEl === avatarParent.lastElementChild : false

      let sender = ''

      if (avatarEl) {
        if (isSelf) {
          const prevSibling = avatarEl.previousElementSibling
          sender = prevSibling?.querySelector('div')?.textContent?.trim() || ''
        } else {
          const nextSibling = avatarEl.nextElementSibling
          sender = nextSibling?.querySelector('div')?.textContent?.trim() || ''
        }
      }

      const hasCard = li.querySelector('[class*="card--"]')
      const avatarCount = li.querySelectorAll('[class*="avatar--"]').length
      const totalImages = li.querySelectorAll('img').length
      const isImageMessage = totalImages > avatarCount

      if (hasCard) {
        const cardEl = li.querySelector('[class*="card--"]')
        const titleEl = cardEl?.querySelector('[class*="title--"]') ?? null
        const priceEl = cardEl?.querySelector('[class*="price--"]') ?? null
        const linkEl = cardEl?.closest('a') ?? null
        const contentEl = cardEl?.querySelector('[class*="content--"]') ?? null

        messages.push({
          type: 'card',
          sender,
          isSelf,
          cardInfo: {
            title: titleEl?.textContent?.trim() || contentEl?.textContent?.trim() || '',
            price: priceEl?.textContent?.trim() || '',
            href: (linkEl as HTMLAnchorElement)?.href || ''
          }
        })
      } else if (isImageMessage) {
        // 提取图片 URL（排除 avatar 图片）
        const allImgs = li.querySelectorAll('img')
        const avatarImgs = Array.from(li.querySelectorAll('[class*="avatar--"] img'))
        const messageImgs = Array.from(allImgs).filter((img) => !avatarImgs.includes(img))
        const imageUrl = messageImgs[0]?.src || ''

        messages.push({
          type: 'image',
          sender,
          isSelf,
          imageUrl
        })
      } else {
        const textEl = li.querySelector('[class*="message-text--"] span')
        const textContent = textEl?.textContent?.trim() || ''
        if (textContent) {
          messages.push({
            type: 'text',
            sender,
            isSelf,
            content: textContent
          })
        }
      }
    })

    return messages
  }

  /**
   * 提取左侧会话列表
   *
   * 解析闲鱼 /im 页面左侧的会话列表，提取每个会话的：
   * - 用户名、最近消息、时间
   * - 未读标记和数量
   * - 商品图片
   * - 交易状态
   * - 类型（user / system）
   *
   * system 类型判定：无商品图片或有 reminder 标记
   */
  static getChatList(): ChatListItem[] {
    const conversations: ChatListItem[] = []

    const items = document.querySelectorAll('div[class*="conversation-item--"]')
    items.forEach((item) => {
      const result: ChatListItem = {
        type: 'unknown',
        userName: '',
        lastMessage: '',
        time: '',
        hasUnread: false,
        unreadCount: 0,
        itemImage: '',
        hasItemImage: false,
        tradeStatus: '',
        dom: item
      }

      const dropdownTrigger = item.querySelector('.ant-dropdown-trigger')

      // 提取商品图片（排除 badge 和 order 图标中的图片）
      const imgs = item.querySelectorAll('img')
      for (const img of imgs) {
        const parentClass = img.parentElement?.className || ''
        if (parentClass.indexOf('ant-badge') === -1 && parentClass.indexOf('order-') === -1) {
          result.itemImage = img.src
          result.hasItemImage = true
          break
        }
      }

      if (dropdownTrigger) {
        const infoDiv = dropdownTrigger.children[0]
        if (infoDiv && infoDiv.children.length >= 2) {
          const colContainer = infoDiv.children[1]
          if (colContainer && colContainer.children.length >= 4) {
            const colChildren = colContainer.children

            // 第二列：用户名 + 交易状态
            const userNameDiv = colChildren[1]
            if (userNameDiv && userNameDiv.children.length > 0) {
              const userNameInner = userNameDiv.querySelector('div')
              if (userNameInner) {
                result.userName = userNameInner.textContent?.trim() || ''
              }
              if (userNameDiv.children.length > 1) {
                result.tradeStatus =
                  (userNameDiv.children[1] as HTMLElement).textContent?.trim() || ''
              }
            }

            // 第三列：最近消息
            if (colChildren[2]) {
              result.lastMessage = (colChildren[2] as HTMLElement).textContent?.trim() || ''
            }

            // 第四列：时间
            if (colChildren[3]) {
              result.time = (colChildren[3] as HTMLElement).textContent?.trim() || ''
            }
          }

          // 第一列（avatar 区域）：未读标记
          const avatarArea = infoDiv.children[0]
          if (avatarArea) {
            const unreadBadge = avatarArea.querySelector('sup.ant-scroll-number')
            if (unreadBadge) {
              result.hasUnread = true
              const badgeTitle = unreadBadge.getAttribute('title')
              result.unreadCount = badgeTitle ? parseInt(badgeTitle, 10) || 0 : 0
            }
          }
        }
      }

      // 类型判定：无商品图片或有 reminder 标记 → system
      const hasReminder = !!item.querySelector('img[alt="reminder"]')
      const isSystem = !result.hasItemImage || hasReminder
      result.type = isSystem ? 'system' : 'user'

      conversations.push(result)
    })

    return conversations
  }

  /**
   * 提取当前聊天窗口的状态快照
   *
   * 用于 ImRobot tick 中检测"已打开聊天窗口中收到新消息"的场景。
   * 返回纯 DOM 数据，不含业务判断（如 isMyProduct 由调用方判断）。
   *
   * isChatOpen 判定：main 区域存在且包含用户名文本
   */
  static getCurrentWindowSnapshot(): {
    isChatOpen: boolean
    userName: string
    itemId: string
    lastUserMessage: string
  } {
    const mainEl = document.querySelector('main')
    if (!mainEl) {
      return { isChatOpen: false, userName: '', itemId: '', lastUserMessage: '' }
    }

    // 复用 getCurrentChatInfo 的选择器提取用户名和 itemId
    const info = ImDomExtractor.getCurrentChatInfo()
    if (!info.userName) {
      return { isChatOpen: false, userName: '', itemId: '', lastUserMessage: '' }
    }

    // 从消息列表中倒序查找最后一条对方发的文本消息
    const messages = ImDomExtractor.getChatMessages()
    let lastUserMessage = ''
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].isSelf && messages[i].type === 'text' && messages[i].content) {
        lastUserMessage = messages[i].content || ''
        break
      }
    }

    return {
      isChatOpen: true,
      userName: info.userName,
      itemId: info.itemId,
      lastUserMessage
    }
  }
}
