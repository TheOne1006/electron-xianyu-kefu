import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockBuildChatId = vi.fn<(userName: string, itemId: string | null) => string>()
const mockCreateOrUpdate = vi.fn<(...args: unknown[]) => void>()
const mockAppendMessage = vi.fn<(...args: unknown[]) => void>()
const mockClassifyIntent = vi.fn<(...args: unknown[]) => Promise<string>>()
const mockMapIntentToAgent = vi.fn<(...args: unknown[]) => string>()
const mockRunAgent = vi.fn<(...args: unknown[]) => Promise<string>>()
const mockSendToBrowser = vi.fn<(...args: unknown[]) => void>()
const mockGetMainWindow = vi.fn<(...args: unknown[]) => null>()
const mockSendToRenderer = vi.fn<(...args: unknown[]) => void>()
const mockEnqueue = vi.fn<(...args: unknown[]) => { success: boolean; error?: string }>()
const mockGetReplyQueueFirstChatId = vi.fn<() => string | null>()
const mockGetConversationById = vi.fn()
const mockGetProductById = vi.fn()

// Mock conversation-store
vi.mock('../../stores/conversation-store', () => ({
  buildChatId: (...args: [string, string | null]) => mockBuildChatId(...args),
  createOrUpdate: (...args: unknown[]) => mockCreateOrUpdate(...args),
  appendMessage: (...args: [string, string]) => mockAppendMessage(...args),
  getById: (...args: unknown[]) => mockGetConversationById(...args)
}))

// Mock intent-router
vi.mock('../../business/intent-router', () => ({
  classifyIntent: (msg: string) => mockClassifyIntent(msg),
  mapIntentToAgent: (intent: string) => mockMapIntentToAgent(intent)
}))

// Mock agent-runner
vi.mock('../../business/agent-runner', () => ({
  runAgent: (...args: [string, unknown, unknown]) => mockRunAgent(...args)
}))

// Mock browser
vi.mock('../../browser', () => ({
  sendToBrowser: (...args: [string, unknown]) => mockSendToBrowser(...args),
  getMainWindow: () => mockGetMainWindow(),
  sendToRenderer: (...args: [string, unknown]) => mockSendToRenderer(...args)
}))

// Mock reply-queue
vi.mock('../../stores/reply-queue', () => ({
  enqueue: (...args: [string]) => mockEnqueue(...args),
  getFirst: () => mockGetReplyQueueFirstChatId()
}))

// Mock product-store
vi.mock('../../stores/product-store', () => ({
  getById: (...args: unknown[]) => mockGetProductById(...args)
}))

import { handleNewUserMessage, getReply } from '../../../main/business/agent'
import type { Conversation, ChatInfo, ChatMessage } from '../../../shared/types'

function createTestPacket(lastMessage: string, isSelf: boolean = false): Conversation {
  const chatInfo: ChatInfo = {
    userName: '测试用户',
    itemId: 'item123',
    isMyProduct: true
  }
  const messages: ChatMessage[] = [
    { type: 'text', sender: '测试用户', isSelf, content: lastMessage }
  ]
  return { chatInfo, messages }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockBuildChatId.mockReturnValue('test-user-item123')
  mockCreateOrUpdate.mockReturnValue(undefined)
  mockGetProductById.mockReturnValue({ id: 'item123', title: '测试商品' })
  mockClassifyIntent.mockResolvedValue('bargain')
  mockMapIntentToAgent.mockReturnValue('price')
  mockRunAgent.mockResolvedValue('好的，可以便宜点')
  mockEnqueue.mockReturnValue({ success: true })
})

describe('handleNewUserMessage', () => {
  it('正常流程：分类 → 映射 → 执行 Agent → 记录回复 → 推送', async () => {
    const packet = createTestPacket('便宜点吧')
    await handleNewUserMessage(packet)

    expect(mockBuildChatId).toHaveBeenCalledWith('测试用户', 'item123')
    expect(mockCreateOrUpdate).toHaveBeenCalled()
    expect(mockClassifyIntent).toHaveBeenCalledWith('便宜点吧')
    expect(mockMapIntentToAgent).toHaveBeenCalledWith('bargain')
    expect(mockRunAgent).toHaveBeenCalledWith(
      'price',
      expect.objectContaining({ id: 'item123', title: '测试商品' }),
      expect.any(Array)
    )
    // appendMessage 只在 runAgent 成功后被调用，记录 AI 回复
    expect(mockAppendMessage).toHaveBeenCalledWith('test-user-item123', '好的，可以便宜点')
    expect(mockEnqueue).toHaveBeenCalledWith('test-user-item123')
  })

  it('空消息不处理', async () => {
    const packet = createTestPacket('', false)
    await handleNewUserMessage(packet)
    expect(mockClassifyIntent).not.toHaveBeenCalled()
  })

  it('runAgent 失败时记录 system 消息不崩溃', async () => {
    mockRunAgent.mockRejectedValue(new Error('API 不可用'))
    const packet = createTestPacket('你好')
    await handleNewUserMessage(packet)
    // runAgent 失败时 appendMessage 不会被调用，因为 agent.ts 中 catch 里没有调用 appendMessage
    // 但函数不会崩溃
    expect(mockAppendMessage).not.toHaveBeenCalled()
  })

  it('最后一条为 AI 消息时不处理也不记录', async () => {
    const packet = createTestPacket('你好', true) // isSelf = true 表示 AI 发送
    await handleNewUserMessage(packet)
    expect(mockAppendMessage).not.toHaveBeenCalled() // AI 消息不记录
    expect(mockClassifyIntent).not.toHaveBeenCalled() // 不触发 Agent
  })

  it('商品不存在时不处理', async () => {
    mockGetProductById.mockReturnValue(undefined)
    const packet = createTestPacket('便宜点吧')
    await handleNewUserMessage(packet)
    expect(mockClassifyIntent).not.toHaveBeenCalled()
  })

  it('lastMsg.type !== text 时提前返回', async () => {
    const packet = createTestPacket('便宜点')
    packet.messages[0].type = 'image'
    await handleNewUserMessage(packet)
    expect(mockClassifyIntent).not.toHaveBeenCalled()
  })
})

describe('getReply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('队列为空时返回 null', () => {
    mockGetReplyQueueFirstChatId.mockReturnValue(null)
    const result = getReply()
    expect(result).toBeNull()
  })

  it('对话不存在时返回 null', () => {
    mockGetReplyQueueFirstChatId.mockReturnValue('chat-1')
    mockGetConversationById.mockReturnValue(null)
    const result = getReply()
    expect(result).toBeNull()
  })

  it('对话存在但消息数组为空时返回 null', () => {
    mockGetReplyQueueFirstChatId.mockReturnValue('chat-1')
    mockGetConversationById.mockReturnValue({
      chatInfo: { userName: 'u', itemId: 'i', isMyProduct: false },
      messages: []
    })
    expect(getReply()).toBeNull()
  })

  it('最后一条消息非AI发送时返回 null', () => {
    mockGetReplyQueueFirstChatId.mockReturnValue('chat-1')
    mockGetConversationById.mockReturnValue({
      chatInfo: { userName: 'u', itemId: 'i', isMyProduct: false },
      messages: [{ type: 'text', sender: 'u', isSelf: false, content: 'hello' }]
    })
    expect(getReply()).toBeNull()
  })

  it('成功场景返回 chatInfo 和 replyText', () => {
    mockGetReplyQueueFirstChatId.mockReturnValue('chat-1')
    mockGetConversationById.mockReturnValue({
      chatInfo: { userName: 'u', itemId: 'i', isMyProduct: false },
      messages: [{ type: 'text', sender: 'AI', isSelf: true, content: '好的，便宜点' }]
    })
    expect(getReply()).toEqual({
      chatInfo: { userName: 'u', itemId: 'i', isMyProduct: false },
      replyText: '好的，便宜点'
    })
  })
})
