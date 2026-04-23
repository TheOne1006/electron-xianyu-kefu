import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetProductById = vi.fn()
const mockGetAppConfig = vi.fn()
const mockBuildChatId = vi.fn()
const mockPushReplyToInjector = vi.fn<(...args: unknown[]) => Promise<boolean>>()
const mockEnqueue = vi.fn()
const mockFetch = vi.fn()

vi.mock('../../stores/product-store', () => ({
  getById: (...args: unknown[]) => mockGetProductById(...args)
}))

vi.mock('../../stores/app-config-store', () => ({
  getAppConfig: () => mockGetAppConfig()
}))

vi.mock('../../stores/conversation-store', () => ({
  buildChatId: (...args: unknown[]) => mockBuildChatId(...args)
}))

vi.mock('../../browser', () => ({
  pushReplyToInjector: (...args: unknown[]) => mockPushReplyToInjector(...args)
}))

vi.mock('../../stores/reply-queue', () => ({
  enqueue: (...args: unknown[]) => mockEnqueue(...args)
}))

globalThis.fetch = mockFetch as unknown as typeof fetch

import { handlePaymentEvent } from '../../../main/business/payment-handler'
import type { ChatInfo, PaymentInfo, Product, AppConfig } from '../../../shared/types'

function createTestChatInfo(): ChatInfo {
  return { userName: '测试买家', itemId: 'item123', isMyProduct: true }
}

function createTestPaymentInfo(): PaymentInfo {
  return { title: '我已付款，等待你发货', description: '请包装好商品' }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetProductById.mockReturnValue({
    id: 'item123',
    title: '测试商品',
    autoDeliver: false,
    autoDeliverContent: ''
  } as Product)
  mockGetAppConfig.mockReturnValue({
    orderWebhookUrl: 'https://example.com/notify?product=<title>'
  } as AppConfig)
  mockBuildChatId.mockReturnValue('测试买家_item123')
  mockPushReplyToInjector.mockResolvedValue(true)
  mockEnqueue.mockReturnValue({ success: true })
  mockFetch.mockResolvedValue({ ok: true })
})

describe('payment-handler', () => {
  describe('自动发货', () => {
    it('商品启用自动发货时推送 autoDeliverContent', async () => {
      mockGetProductById.mockReturnValue({
        id: 'item123',
        title: '测试商品',
        autoDeliver: true,
        autoDeliverContent: '兑换码: ABC123'
      } as Product)

      await handlePaymentEvent(createTestChatInfo(), createTestPaymentInfo())

      expect(mockBuildChatId).toHaveBeenCalledWith('测试买家', 'item123')
      expect(mockPushReplyToInjector).toHaveBeenCalledWith('测试买家_item123', '兑换码: ABC123')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('主动推送失败时回退到 enqueue', async () => {
      mockGetProductById.mockReturnValue({
        id: 'item123',
        title: '测试商品',
        autoDeliver: true,
        autoDeliverContent: '兑换码: ABC123'
      } as Product)
      mockPushReplyToInjector.mockResolvedValue(false)

      await handlePaymentEvent(createTestChatInfo(), createTestPaymentInfo())

      expect(mockEnqueue).toHaveBeenCalledWith('测试买家_item123', '兑换码: ABC123')
    })
  })

  describe('Webhook 通知', () => {
    it('商品未启用自动发货时调用 webhook URL', async () => {
      mockGetProductById.mockReturnValue({
        id: 'item123',
        title: '测试商品',
        autoDeliver: false
      } as Product)

      await handlePaymentEvent(createTestChatInfo(), createTestPaymentInfo())

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/notify?product=%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81'
      )
      expect(mockPushReplyToInjector).not.toHaveBeenCalled()
    })

    it('webhook URL 为空时不调用', async () => {
      mockGetProductById.mockReturnValue({
        id: 'item123',
        title: '测试商品',
        autoDeliver: false
      } as Product)
      mockGetAppConfig.mockReturnValue({ orderWebhookUrl: '' } as AppConfig)

      await handlePaymentEvent(createTestChatInfo(), createTestPaymentInfo())

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('webhook 调用失败不影响流程', async () => {
      mockGetProductById.mockReturnValue({
        id: 'item123',
        title: '测试商品',
        autoDeliver: false
      } as Product)
      mockFetch.mockRejectedValue(new Error('network error'))

      await expect(
        handlePaymentEvent(createTestChatInfo(), createTestPaymentInfo())
      ).resolves.toBeUndefined()
    })
  })

  describe('边界情况', () => {
    it('商品不存在时不处理', async () => {
      mockGetProductById.mockReturnValue(null)

      await handlePaymentEvent(createTestChatInfo(), createTestPaymentInfo())

      expect(mockPushReplyToInjector).not.toHaveBeenCalled()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('自动发货内容为空时不发送', async () => {
      mockGetProductById.mockReturnValue({
        id: 'item123',
        title: '测试商品',
        autoDeliver: true,
        autoDeliverContent: ''
      } as Product)

      await handlePaymentEvent(createTestChatInfo(), createTestPaymentInfo())

      expect(mockPushReplyToInjector).not.toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalled()
    })
  })
})
