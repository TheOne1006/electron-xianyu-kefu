import { describe, it, expect, beforeEach, vi } from 'vitest'

// 引入 setup.ts 以触发 electron-store 等基础 mock 注册
import './setup'

// Mock 数据
const mockAppConfig = {
  model: 'gpt-4o',
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'test-key',
  language: 'zh',
  humanTakeoverKeywords: '',
  safetyFilterBlockedKeywords: [] as string[],
  safetyFilterReplacement: ''
}

const mockAgentsData = {
  classify: { temperature: 0.1, maxTokens: 20, prompt: 'classify prompt' },
  price: { temperature: 0.4, maxTokens: 500, prompt: 'price prompt' },
  tech: { temperature: 0.4, maxTokens: 500, prompt: 'tech prompt' },
  default: { temperature: 0.7, maxTokens: 500, prompt: 'default prompt' },
  system: { temperature: 0.7, maxTokens: 500, prompt: 'system prompt' }
}

const mockProductsData = [
  { id: 'p1', title: '商品1' },
  { id: 'p2', title: '商品2' },
  { id: 'item-123', title: '测试商品' }
]

const mockConversationsData = {
  'chat-1': { chatInfo: { userName: '买家1', itemId: 'item-1', isMyProduct: false }, messages: [] }
}

const mockDocumentsData = {
  产品介绍模板: '这是一款高品质的商品',
  售后说明: '感谢您的购买'
}

import { ipcMain } from 'electron'
import { registerIpcHandlers } from '../ipc-handlers'
import { setMockStoreData, resetMockStoreData } from './mock-electron-store'

describe('ipc-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 重置并设置 mock store 数据
    resetMockStoreData()
    setMockStoreData({
      ...mockAppConfig,
      ...mockAgentsData,
      products: mockProductsData,
      ...mockConversationsData,
      ...mockDocumentsData
    })
    // 重新注册 handlers
    registerIpcHandlers()
  })

  describe('ping', () => {
    it('返回 pong', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const pingHandler = calls.find((call) => call[0] === 'ping')
      expect(pingHandler).toBeDefined()
      const handler = pingHandler?.[1] as () => { code: number; message: string; data: string }
      const result = handler()
      expect(result).toEqual({ code: 0, message: '', data: 'pong' })
    })
  })

  describe('config:get', () => {
    it('返回 app config', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const configHandler = calls.find((call) => call[0] === 'config:get')
      expect(configHandler).toBeDefined()
      const handler = configHandler?.[1] as () => { code: number; data: unknown }
      const result = handler()
      expect(result.code).toBe(0)
      expect(result.data).toHaveProperty('model')
      expect(result.data).toHaveProperty('apiKey')
    })
  })

  describe('config:save', () => {
    it('保存部分配置', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const saveHandler = calls.find((call) => call[0] === 'config:save')
      expect(saveHandler).toBeDefined()
      const handler = saveHandler?.[1] as () => { code: number }
      const result = handler()
      expect(result.code).toBe(0)
    })
  })

  describe('product:list', () => {
    it('返回产品列表', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const listHandler = calls.find((call) => call[0] === 'product:list')
      expect(listHandler).toBeDefined()
      const handler = listHandler?.[1] as () => { code: number; data: unknown }
      const result = handler()
      expect(result.code).toBe(0)
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('product:getById', () => {
    it('返回指定产品', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const getByIdHandler = calls.find((call) => call[0] === 'product:getById')
      expect(getByIdHandler).toBeDefined()
      const handler = getByIdHandler?.[1] as (
        _event: unknown,
        { id }: { id: string }
      ) => { code: number; data: unknown }
      const result = handler(null as never, { id: 'p1' })
      expect(result.code).toBe(0)
    })
  })

  describe('product:upsert', () => {
    it('保存产品', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const upsertHandler = calls.find((call) => call[0] === 'product:upsert')
      expect(upsertHandler).toBeDefined()
      const handler = upsertHandler?.[1] as (
        _event: unknown,
        product: unknown
      ) => { code: number; data: unknown }
      const result = handler(null as never, { id: 'p-new', title: '新商品' })
      expect(result.code).toBe(0)
      expect(result.data).toHaveProperty('id', 'p-new')
    })
  })

  describe('product:deleteById', () => {
    it('删除产品', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const deleteHandler = calls.find((call) => call[0] === 'product:deleteById')
      expect(deleteHandler).toBeDefined()
      const handler = deleteHandler?.[1] as (
        _event: unknown,
        { id }: { id: string }
      ) => { code: number }
      const result = handler(null as never, { id: 'p1' })
      expect(result.code).toBe(0)
    })
  })

  describe('agent-config:all', () => {
    it('返回所有 agent 配置', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const allHandler = calls.find((call) => call[0] === 'agent-config:all')
      expect(allHandler).toBeDefined()
      const handler = allHandler?.[1] as () => { code: number; data: unknown }
      const result = handler()
      expect(result.code).toBe(0)
    })
  })

  describe('agent-config:getById', () => {
    it('返回指定 agent 配置', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const getByIdHandler = calls.find((call) => call[0] === 'agent-config:getById')
      expect(getByIdHandler).toBeDefined()
      const handler = getByIdHandler?.[1] as (
        _event: unknown,
        { key }: { key: string }
      ) => { code: number; data: unknown }
      const result = handler(null as never, { key: 'classify' })
      expect(result.code).toBe(0)
    })
  })

  describe('agent-config:update', () => {
    it('更新 agent 配置', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const updateHandler = calls.find((call) => call[0] === 'agent-config:update')
      expect(updateHandler).toBeDefined()
      const handler = updateHandler?.[1] as (
        _event: unknown,
        args: { key: string; config: unknown }
      ) => { code: number }
      const result = handler(null as never, {
        key: 'classify',
        config: { temperature: 0.5, maxTokens: 100, prompt: 'test' }
      })
      expect(result.code).toBe(0)
    })
  })

  describe('agent-config:upsert', () => {
    it('插入或更新 agent 配置', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const upsertHandler = calls.find((call) => call[0] === 'agent-config:upsert')
      expect(upsertHandler).toBeDefined()
      const handler = upsertHandler?.[1] as (
        _event: unknown,
        args: { key: string; config: unknown }
      ) => { code: number }
      const result = handler(null as never, {
        key: 'classify',
        config: { temperature: 0.5, maxTokens: 100, prompt: 'test' }
      })
      expect(result.code).toBe(0)
    })
  })

  describe('conversation:list', () => {
    // 单独设置仅包含 conversation 数据的 mock，避免混合数据干扰
    beforeEach(() => {
      vi.clearAllMocks()
      resetMockStoreData()
      setMockStoreData({
        ...mockConversationsData
      })
      registerIpcHandlers()
    })

    it('返回对话列表', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const listHandler = calls.find((call) => call[0] === 'conversation:list')
      expect(listHandler).toBeDefined()
      const handler = listHandler?.[1] as () => { code: number; data: unknown }
      const result = handler()
      expect(result.code).toBe(0)
    })
  })

  describe('conversation:getById', () => {
    it('返回指定对话', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const getByIdHandler = calls.find((call) => call[0] === 'conversation:getById')
      expect(getByIdHandler).toBeDefined()
      const handler = getByIdHandler?.[1] as (
        _event: unknown,
        { chatId }: { chatId: string }
      ) => { code: number; data: unknown }
      const result = handler(null as never, { chatId: 'chat-1' })
      expect(result.code).toBe(0)
    })
  })

  describe('conversation:createOrUpdate', () => {
    it('创建或更新对话', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const upsertHandler = calls.find((call) => call[0] === 'conversation:createOrUpdate')
      expect(upsertHandler).toBeDefined()
      const handler = upsertHandler?.[1] as (
        _event: unknown,
        data: { chatInfo: { userName: string; itemId: string }; messages: unknown[] }
      ) => { code: number; data: unknown }
      const result = handler(null as never, {
        chatInfo: { userName: 'test-user', itemId: 'p1' },
        messages: []
      })
      expect(result.code).toBe(0)
    })
  })

  describe('conversation:delete', () => {
    it('删除对话', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const deleteHandler = calls.find((call) => call[0] === 'conversation:delete')
      expect(deleteHandler).toBeDefined()
      const handler = deleteHandler?.[1] as (
        _event: unknown,
        { chatId }: { chatId: string }
      ) => { code: number }
      const result = handler(null as never, { chatId: 'chat-1' })
      expect(result.code).toBe(0)
    })
  })

  describe('reply-queue:dequeue', () => {
    it('出队', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const dequeueHandler = calls.find((call) => call[0] === 'reply-queue:dequeue')
      expect(dequeueHandler).toBeDefined()
      const handler = dequeueHandler?.[1] as () => { code: number; data: string | null }
      const result = handler()
      expect(result.code).toBe(0)
    })
  })

  describe('reply-queue:enqueue', () => {
    it('成功追加消息并入队', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const enqueueHandler = calls.find((call) => call[0] === 'reply-queue:enqueue')
      expect(enqueueHandler).toBeDefined()
      const handler = enqueueHandler?.[1] as (
        _event: unknown,
        args: { chatId: string; content: string }
      ) => { code: number }
      const result = handler(null as never, { chatId: 'chat-1', content: '你好' })
      expect(result.code).toBe(0)
    })

    it('入队失败时仍返回成功（幂等 chatId）', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const enqueueHandler = calls.find((call) => call[0] === 'reply-queue:enqueue')
      expect(enqueueHandler).toBeDefined()
      const handler = enqueueHandler?.[1] as (
        _event: unknown,
        args: { chatId: string; content: string }
      ) => { code: number }

      // 第一次入队
      const result1 = handler(null as never, { chatId: 'chat-1', content: '消息1' })
      expect(result1.code).toBe(0)

      // 第二次入队相同 chatId（幂等失败，但 handler 仍然返回 ok）
      const result2 = handler(null as never, { chatId: 'chat-1', content: '消息2' })
      expect(result2.code).toBe(0)
    })
  })

  describe('conversation:upsert', () => {
    it('处理新用户消息', async () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const upsertHandler = calls.find((call) => call[0] === 'conversation:upsert')
      expect(upsertHandler).toBeDefined()
      const handler = upsertHandler?.[1] as (
        _event: unknown,
        data: { chatInfo: { userName: string; itemId: string }; messages: unknown[] }
      ) => { code: number }
      const result = await handler(null as never, {
        chatInfo: { userName: 'test-user', itemId: 'item-123' },
        messages: []
      })
      expect(result.code).toBe(0)
    })
  })

  describe('xy-browser:launch', () => {
    it('handler 已注册', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const launchHandler = calls.find((call) => call[0] === 'xy-browser:launch')
      expect(launchHandler).toBeDefined()
      // 注意: createXYBrowserWindow 使用 new BrowserWindow()，mock 不支持构造函数测试
      // 实际调用会失败，因为 mock BrowserWindow 不是真正的构造函数
    })
  })

  describe('xy-browser:close', () => {
    it('handler 已注册', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const handler = calls.find((call) => call[0] === 'xy-browser:close')
      expect(handler).toBeDefined()
    })
  })

  describe('xy-browser:getStatus', () => {
    it('handler 已注册', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const handler = calls.find((call) => call[0] === 'xy-browser:getStatus')
      expect(handler).toBeDefined()
    })
  })

  describe('simulate:click', () => {
    it('handler 已注册', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const simulateClickHandler = calls.find((call) => call[0] === 'simulate:click')
      expect(simulateClickHandler).toBeDefined()
    })

    it('调用 sendInputEvent 发送鼠标事件序列', async () => {
      const { mockWebContents } = await import('./__mocks__/electron')
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const simulateClickHandler = calls.find((call) => call[0] === 'simulate:click')
      expect(simulateClickHandler).toBeDefined()

      const handler = simulateClickHandler?.[1] as (
        event: { sender: unknown },
        x: number,
        y: number
      ) => Promise<void>

      // 模拟事件对象
      const mockEvent = { sender: 'mock-sender' }

      // 调用 handler（异步）
      await handler(mockEvent as never, 100, 200)

      // 验证 sendInputEvent 被调用多次（移动步数 + mouseDown + mouseUp）
      expect(mockWebContents.sendInputEvent).toHaveBeenCalled()

      // 获取所有调用参数
      const allCalls = mockWebContents.sendInputEvent.mock.calls
      expect(allCalls.length).toBeGreaterThanOrEqual(12) // 至少 10 步移动 + mouseDown + mouseUp

      // 验证最后一个事件是 mouseUp
      const lastCall = allCalls[allCalls.length - 1][0] as { type: string; button: string }
      expect(lastCall.type).toBe('mouseUp')
      expect(lastCall.button).toBe('left')

      // 验证有 mouseMove 事件
      const moveCalls = allCalls.filter(
        (call) => (call[0] as { type: string }).type === 'mouseMove'
      )
      expect(moveCalls.length).toBeGreaterThanOrEqual(10)

      // 验证有 mouseDown 事件
      const downCalls = allCalls.filter(
        (call) => (call[0] as { type: string }).type === 'mouseDown'
      )
      expect(downCalls.length).toBe(1)
    })

    it('BrowserWindow 不存在时静默失败', async () => {
      const { BrowserWindow } = await import('electron')
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValueOnce(null)

      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const simulateClickHandler = calls.find((call) => call[0] === 'simulate:click')
      expect(simulateClickHandler).toBeDefined()

      const handler = simulateClickHandler?.[1] as (
        event: { sender: unknown },
        x: number,
        y: number
      ) => Promise<void>

      const mockEvent = { sender: 'mock-sender' }

      // 返回错误对象但不抛出异常
      const result = await handler(mockEvent as never, 100, 200)
      expect(result).toEqual({ code: 3004, message: '窗口不存在', data: null })
    })
  })

  describe('simulate:chinese-input', () => {
    it('handler 已注册', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const handler = calls.find((call) => call[0] === 'simulate:chinese-input')
      expect(handler).toBeDefined()
    })

    it('成功模拟中文输入', async () => {
      const { mockWebContents } = await import('./__mocks__/electron')
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const handler = calls.find((call) => call[0] === 'simulate:chinese-input')?.[1]

      expect(handler).toBeDefined()

      const mockEvent = { sender: 'mock-sender' }
      const result = await handler(mockEvent, '你好世界')

      expect(result.code).toBe(0)
      expect(mockWebContents.insertText).toHaveBeenCalled()
    })

    it('BrowserWindow 不存在时返回错误', async () => {
      const { BrowserWindow } = await import('electron')
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValueOnce(null)

      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const handler = calls.find((call) => call[0] === 'simulate:chinese-input')?.[1]

      expect(handler).toBeDefined()

      const mockEvent = { sender: 'mock-sender' }
      const result = await handler(mockEvent, '你好')

      expect(result).toEqual({ code: 3005, message: '窗口不存在', data: null })
    })
  })

  describe('simulate:enter-key', () => {
    it('handler 已注册', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const handler = calls.find((call) => call[0] === 'simulate:enter-key')
      expect(handler).toBeDefined()
    })

    it('成功模拟 Enter 键发送', async () => {
      const { mockWebContents } = await import('./__mocks__/electron')
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const handler = calls.find((call) => call[0] === 'simulate:enter-key')?.[1]

      expect(handler).toBeDefined()

      const mockEvent = { sender: 'mock-sender' }
      const result = await handler(mockEvent, { x: 100, y: 200 })

      expect(result.code).toBe(0)
      // 验证鼠标点击事件
      const sendInputEventCalls = mockWebContents.sendInputEvent.mock.calls
      const mouseDownEvents = sendInputEventCalls.filter((call) => call[0].type === 'mouseDown')
      expect(mouseDownEvents.length).toBeGreaterThanOrEqual(1)

      // 验证 Enter 键事件
      const keyDownEvents = sendInputEventCalls.filter(
        (call) => call[0].type === 'keyDown' && call[0].keyCode === 'Return'
      )
      expect(keyDownEvents.length).toBe(1)
    })

    it('BrowserWindow 不存在时返回错误', async () => {
      const { BrowserWindow } = await import('electron')
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValueOnce(null)

      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const handler = calls.find((call) => call[0] === 'simulate:enter-key')?.[1]

      expect(handler).toBeDefined()

      const mockEvent = { sender: 'mock-sender' }
      const result = await handler(mockEvent, { x: 100, y: 200 })

      expect(result).toEqual({ code: 3002, message: '窗口不存在', data: null })
    })
  })

  describe('document:list', () => {
    it('返回文档标题列表', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const listHandler = calls.find((call) => call[0] === 'document:list')
      expect(listHandler).toBeDefined()
      const handler = listHandler?.[1] as () => { code: number; data: unknown }
      const result = handler()
      expect(result.code).toBe(0)
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('document:get', () => {
    it('返回指定文档内容', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const getHandler = calls.find((call) => call[0] === 'document:get')
      expect(getHandler).toBeDefined()
      const handler = getHandler?.[1] as (
        _event: unknown,
        { key }: { key: string }
      ) => { code: number; data: unknown }
      const result = handler(null as never, { key: '售后说明' })
      expect(result.code).toBe(0)
    })
  })

  describe('document:upsert', () => {
    it('创建或更新文档', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const upsertHandler = calls.find((call) => call[0] === 'document:upsert')
      expect(upsertHandler).toBeDefined()
      const handler = upsertHandler?.[1] as (
        _event: unknown,
        args: { key: string; content: string }
      ) => { code: number; data: unknown }
      const result = handler(null as never, { key: '新文档', content: '新内容' })
      expect(result.code).toBe(0)
    })
  })

  describe('document:delete', () => {
    it('删除文档', () => {
      const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
      const deleteHandler = calls.find((call) => call[0] === 'document:delete')
      expect(deleteHandler).toBeDefined()
      const handler = deleteHandler?.[1] as (
        _event: unknown,
        { key }: { key: string }
      ) => { code: number }
      const result = handler(null as never, { key: '售后说明' })
      expect(result.code).toBe(0)
    })
  })
})
