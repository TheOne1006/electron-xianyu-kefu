/**
 * ImRobot E2E 测试
 *
 * 测试 ImRobot 状态机在真实 Electron BrowserWindow 中的完整行为：
 * - 消息采集到 IPC 推送
 * - 状态机流程（IDLE → CHECKING → PROCESSING → IDLE）
 * - 回复发送流程（dequeue → 匹配 → 点击 → 输入 → 发送）
 */
import { describe, it, expect, beforeEach, afterEach } from '../lib/test-framework'
import {
  createMockIMPage,
  waitForCall,
  waitForCallCondition,
  type MockIMPage
} from '../fixtures/mock-im.fixture'

describe('ImRobot E2E', () => {
  let page: MockIMPage

  beforeEach(async () => {
    page = await createMockIMPage()
  })

  afterEach(() => {
    page.cleanup()
  })

  describe('消息采集到 IPC 推送', () => {
    it('收到新消息后应通过 conversation.upsert 推送', async () => {
      await page.clearCallLog()

      // 模拟收到新消息
      await page.evaluate('MockIM.simulateIncomingMessage("这个多少钱？")')

      // 手动触发 tick（更快更可控）
      await page.triggerDomChange()

      // 等待 conversation.upsert 被调用
      await waitForCall(page, 'electronAPI', 'conversation.upsert', 3000)

      const log = await page.getCallLog()
      const upsertCall = log.find(
        (e) => e.api === 'electronAPI' && e.method === 'conversation.upsert'
      )
      expect(upsertCall).toBeDefined()
      expect(upsertCall!.args[0]).toEqual(
        expect.objectContaining({
          userName: '买家小明'
        })
      )
    })

    it('推送的消息列表应包含最新消息', async () => {
      await page.clearCallLog()
      await page.evaluate('MockIM.simulateIncomingMessage("还在吗？")')
      await page.triggerDomChange()

      await waitForCall(page, 'electronAPI', 'conversation.upsert', 3000)

      const log = await page.getCallLog()
      const upsertCall = log.find(
        (e) => e.api === 'electronAPI' && e.method === 'conversation.upsert'
      )
      const messages = upsertCall!.args[1] as Array<{ content: string }>
      const lastMsg = messages[messages.length - 1]
      expect(lastMsg.content).toBe('还在吗？')
    })

    it('切换会话后消息列表应正确更新', async () => {
      await page.clearCallLog()

      // 切换到会话 2（用户张三）
      await page.evaluate('MockIM.selectConversation(1)')
      await page.evaluate('MockIM.simulateIncomingMessage(" MacBook 多少钱？")')
      await page.triggerDomChange()

      await waitForCall(page, 'electronAPI', 'conversation.upsert', 3000)

      const log = await page.getCallLog()
      const upsertCall = log.find(
        (e) => e.api === 'electronAPI' && e.method === 'conversation.upsert'
      )
      expect(upsertCall!.args[0]).toEqual(
        expect.objectContaining({
          userName: '用户张三'
        })
      )
    })
  })

  describe('状态机流程', () => {
    it('有未读消息时应触发采集流程', async () => {
      await page.clearCallLog()

      // 会话 1 默认有 3 条未读
      // 触发 tick
      await page.triggerDomChange()

      // 应该点击未读会话项（simulateClick）
      await waitForCall(page, 'electronAPI', 'simulateClick', 3000)

      const log = await page.getCallLog()
      const clickCalls = log.filter((e) => e.api === 'electronAPI' && e.method === 'simulateClick')
      expect(clickCalls.length).toBeGreaterThan(0)
    })

    it('系统消息应被点击后清除', async () => {
      await page.clearCallLog()

      // 让会话 1 无未读，会话 3（系统）有未读
      await page.evaluate('MockIM.setUnread(0, 0)')
      await page.evaluate('MockIM.setUnread(2, 1)')

      await page.triggerDomChange()

      // 系统消息处理：点击 → cleanup
      await waitForCall(page, 'electronAPI', 'simulateClick', 3000)
    })

    it('窗口快照变化时应触发采集', async () => {
      await page.clearCallLog()

      // 确保无未读，但窗口有新消息
      await page.evaluate('MockIM.setUnread(0, 0)')
      // 添加一条新消息（不通过 simulateIncomingMessage 避免设置未读）
      await page.evaluate(
        'MockIM.addMessage({ sender: "买家小明", isSelf: false, type: "text", content: "新消息测试" })'
      )

      await page.triggerDomChange()

      // 应该推送新消息
      await waitForCall(page, 'electronAPI', 'conversation.upsert', 3000)
    })
  })

  describe('回复发送流程', () => {
    it('回复队列有数据时应执行完整发送流程', async () => {
      await page.clearCallLog()

      // 填充回复队列 + 对话数据（模拟 Agent 已处理完毕）
      await page.evaluate(`
        TEST_DATA.replyQueue.push({ chatId: '100001', replyText: '好的，给您优惠价！' })
        // conversation.getById 会自动追加 AI 回复消息
      `)

      // 确保无未读（避免采集流程先处理）
      await page.evaluate(`
        MockIM.setUnread(0, 0)
        MockIM.setUnread(3, 0)
      `)

      // 触发 tick → ImRobot 会先尝试 dequeue
      await page.triggerDomChange()

      // 等待回复发送流程：simulateClick → simulateChineseInput → simulateEnterKey
      await waitForCallCondition(
        page,
        (log) => {
          const hasInput = log.some(
            (e) => e.api === 'electronAPI' && e.method === 'simulateChineseInput'
          )
          const hasEnter = log.some(
            (e) => e.api === 'electronAPI' && e.method === 'simulateEnterKey'
          )
          return hasInput && hasEnter
        },
        15000
      )

      const log = await page.getCallLog()

      // 验证 simulateClick 被调用
      const clickCalls = log.filter((e) => e.api === 'electronAPI' && e.method === 'simulateClick')
      expect(clickCalls.length).toBeGreaterThan(0)

      // 验证 simulateChineseInput 被调用
      const inputCall = log.find(
        (e) => e.api === 'electronAPI' && e.method === 'simulateChineseInput'
      )
      expect(inputCall).toBeDefined()
      // 回复文本应该是预置的 AI 回复
      expect(inputCall!.args[0]).toBeTruthy()

      // 验证 simulateEnterKey 被调用
      const enterCall = log.find((e) => e.api === 'electronAPI' && e.method === 'simulateEnterKey')
      expect(enterCall).toBeDefined()
    })

    it('回复队列为空时不应触发发送操作', async () => {
      await page.clearCallLog()

      // 确保无未读（避免采集流程干扰）
      await page.evaluate(`
        MockIM.setUnread(0, 0)
        MockIM.setUnread(3, 0)
      `)

      await page.triggerDomChange()

      // 等待一下确保没有异步操作
      await new Promise((r) => setTimeout(r, 500))

      const log = await page.getCallLog()
      const sendCalls = log.filter(
        (e) =>
          e.api === 'electronAPI' &&
          (e.method === 'simulateChineseInput' || e.method === 'simulateEnterKey')
      )
      expect(sendCalls).toHaveLength(0)
    })
  })
})
