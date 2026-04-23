/**
 * ImDomExtractor E2E 测试
 *
 * 在真实 Electron BrowserWindow 中加载 mock-xianyu HTML，
 * 验证 ImDomExtractor 的所有 DOM 提取方法在真实 DOM 环境中正确工作。
 */
import { describe, it, expect, beforeEach, afterEach } from '../lib/test-framework'
import { createMockIMPage, type MockIMPage } from '../fixtures/mock-im.fixture'

describe('ImDomExtractor E2E', () => {
  let page: MockIMPage

  beforeEach(async () => {
    page = await createMockIMPage()
  })

  afterEach(() => {
    page.cleanup()
  })

  describe('getCurrentChatInfo()', () => {
    it('应提取当前聊天的用户名和商品 ID', async () => {
      // 默认加载会话 1（买家小明 + iPhone）
      const result = await page.evaluate<{
        userName: string
        itemId: string
        isMyProduct: boolean
      }>(`
        const info = InjectedScript.ImDomExtractor.getCurrentChatInfo()
        JSON.parse(JSON.stringify(info))
      `)

      expect(result.userName).toBe('买家小明')
      expect(result.itemId).toBe('100001')
    })

    it('切换会话后应返回新会话的信息', async () => {
      await page.evaluate('MockIM.selectConversation(1)')

      const result = await page.evaluate<{
        userName: string
        itemId: string
      }>(`
        const info = InjectedScript.ImDomExtractor.getCurrentChatInfo()
        JSON.parse(JSON.stringify(info))
      `)

      expect(result.userName).toBe('用户张三')
      expect(result.itemId).toBe('100002')
    })
  })

  describe('hasUnreadMessages()', () => {
    it('有未读消息时返回 true', async () => {
      // 会话 1 默认有 3 条未读
      const result = await page.evaluate<boolean>(
        'InjectedScript.ImDomExtractor.hasUnreadMessages()'
      )
      expect(result).toBe(true)
    })

    it('无未读消息时返回 false', async () => {
      // 切换到会话 2（无未读）
      await page.evaluate('MockIM.selectConversation(1)')

      const result = await page.evaluate<boolean>(
        'InjectedScript.ImDomExtractor.hasUnreadMessages()'
      )
      expect(result).toBe(false)
    })
  })

  describe('getChatMessages()', () => {
    it('应正确解析文本消息的方向和内容', async () => {
      const messages = await page.evaluate<
        Array<{
          type: string
          sender: string
          isSelf: boolean
          content: string
        }>
      >(`
        const msgs = InjectedScript.ImDomExtractor.getChatMessages()
        JSON.parse(JSON.stringify(msgs))
      `)

      expect(messages).toHaveLength(3)
      expect(messages[0]).toEqual({
        type: 'text',
        sender: '买家小明',
        isSelf: false,
        content: '你好，这个还在吗？'
      })
      expect(messages[1]).toEqual({
        type: 'text',
        sender: '我',
        isSelf: true,
        content: '在的，品质很好，欢迎咨询'
      })
      expect(messages[2]).toEqual({
        type: 'text',
        sender: '买家小明',
        isSelf: false,
        content: '可以便宜点吗？'
      })
    })

    it('应正确解析卡片消息', async () => {
      // 切换到会话 4（AirPods Pro，有卡片消息）
      await page.evaluate('MockIM.selectConversation(3)')

      const messages = await page.evaluate<
        Array<{
          type: string
          cardInfo: { title: string; price: string }
        }>
      >(`
        const msgs = InjectedScript.ImDomExtractor.getChatMessages()
        JSON.parse(JSON.stringify(msgs))
      `)

      const cardMsg = messages.find((m) => m.type === 'card')
      expect(cardMsg).toBeDefined()
      expect(cardMsg!.cardInfo.title).toBe('AirPods Pro 2 USB-C 版')
      expect(cardMsg!.cardInfo.price).toBe('¥1299')
    })

    it('动态添加消息后应返回新消息', async () => {
      await page.evaluate('MockIM.simulateIncomingMessage("这个多少钱？")')

      const messages = await page.evaluate<Array<{ content: string }>>(
        'const msgs = InjectedScript.ImDomExtractor.getChatMessages(); JSON.parse(JSON.stringify(msgs))'
      )

      expect(messages.length).toBe(4)
      expect(messages[messages.length - 1].content).toBe('这个多少钱？')
    })
  })

  describe('getChatList()', () => {
    it('应返回 4 个会话，类型和未读状态正确', async () => {
      const chatList = await page.evaluate<
        Array<{
          type: string
          userName: string
          hasUnread: boolean
          unreadCount: number
          lastMessage: string
        }>
      >(`
        const list = InjectedScript.ImDomExtractor.getChatList()
        list.map(item => ({
          type: item.type,
          userName: item.userName,
          hasUnread: item.hasUnread,
          unreadCount: item.unreadCount,
          lastMessage: item.lastMessage
        }))
      `)

      expect(chatList).toHaveLength(4)
      // 会话 1：用户消息，有未读
      expect(chatList[0].type).toBe('user')
      expect(chatList[0].userName).toBe('买家小明')
      expect(chatList[0].hasUnread).toBe(true)
      expect(chatList[0].unreadCount).toBe(3)
      // 会话 3：系统消息
      expect(chatList[2].type).toBe('system')
      // 会话 4：用户消息，有未读
      expect(chatList[3].hasUnread).toBe(true)
      expect(chatList[3].unreadCount).toBe(1)
    })
  })

  describe('getCurrentWindowSnapshot()', () => {
    it('应返回正确的窗口快照', async () => {
      const snapshot = await page.evaluate<{
        isChatOpen: boolean
        userName: string
        itemId: string
        lastUserMessage: string
      }>(`
        const snap = InjectedScript.ImDomExtractor.getCurrentWindowSnapshot()
        JSON.parse(JSON.stringify(snap))
      `)

      expect(snapshot.isChatOpen).toBe(true)
      expect(snapshot.userName).toBe('买家小明')
      expect(snapshot.itemId).toBe('100001')
      expect(snapshot.lastUserMessage).toBe('可以便宜点吗？')
    })

    it('无聊天打开时 isChatOpen 应为 false', async () => {
      // 清除用户名
      await page.evaluate(`
        document.querySelector('span[class*="text1--"]').textContent = ''
      `)

      const snapshot = await page.evaluate<{ isChatOpen: boolean }>(
        'const snap = InjectedScript.ImDomExtractor.getCurrentWindowSnapshot(); JSON.parse(JSON.stringify(snap))'
      )

      expect(snapshot.isChatOpen).toBe(false)
    })
  })
})
