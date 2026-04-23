import { describe, it, expect, beforeEach, vi } from 'vitest'

// 引入 setup.ts 以触发 electron-store 等基础 mock 注册
import './setup'

// Mock 数据
const mockAppConfig = {
  model: 'gpt-4o',
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'test-key',
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

// 辅助：从 ipcMain.handle mock 提取指定 channel 的 handler
function getHandler(channel: string): (...args: unknown[]) => Promise<unknown> {
  const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls
  const found = calls.find((call) => call[0] === channel)
  expect(found).toBeDefined()
  return found![1] as (...args: unknown[]) => Promise<unknown>
}

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
    it('返回 pong', async () => {
      const handler = getHandler('ping')
      const result = await handler()
      expect(result).toEqual({ code: 0, message: '', data: 'pong' })
    })
  })

  describe('config:get', () => {
    it('返回 app config', async () => {
      const handler = getHandler('config:get')
      const result = (await handler()) as { code: number; data: unknown }
      expect(result.code).toBe(0)
      expect(result.data).toHaveProperty('model')
      expect(result.data).toHaveProperty('apiKey')
    })
  })

  describe('config:save', () => {
    it('保存部分配置', async () => {
      const handler = getHandler('config:save')
      const result = (await handler(null, {})) as { code: number }
      expect(result.code).toBe(0)
    })
  })

  describe('product:list', () => {
    it('返回产品列表', async () => {
      const handler = getHandler('product:list')
      const result = (await handler()) as { code: number; data: unknown }
      expect(result.code).toBe(0)
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('product:getById', () => {
    it('返回指定产品', async () => {
      const handler = getHandler('product:getById')
      const result = (await handler(null, { id: 'p1' })) as { code: number; data: unknown }
      expect(result.code).toBe(0)
    })
  })

  describe('product:upsert', () => {
    it('保存产品', async () => {
      const handler = getHandler('product:upsert')
      const result = (await handler(null, {
        id: 'p-new',
        title: '新商品'
      })) as { code: number; data: unknown }
      expect(result.code).toBe(0)
      expect(result.data).toHaveProperty('id', 'p-new')
    })
  })

  describe('product:deleteById', () => {
    it('删除产品', async () => {
      const handler = getHandler('product:deleteById')
      const result = (await handler(null, { id: 'p1' })) as { code: number }
      expect(result.code).toBe(0)
    })
  })

  describe('agent-config:all', () => {
    it('返回所有 agent 配置', async () => {
      const handler = getHandler('agent-config:all')
      const result = (await handler()) as { code: number; data: unknown }
      expect(result.code).toBe(0)
    })
  })

  describe('agent-config:getById', () => {
    it('返回指定 agent 配置', async () => {
      const handler = getHandler('agent-config:getById')
      const result = (await handler(null, { key: 'classify' })) as { code: number; data: unknown }
      expect(result.code).toBe(0)
    })
  })

  describe('agent-config:update', () => {
    it('更新 agent 配置', async () => {
      const handler = getHandler('agent-config:update')
      const result = (await handler(null, {
        key: 'classify',
        config: { temperature: 0.5, maxTokens: 100, prompt: 'test' }
      })) as { code: number }
      expect(result.code).toBe(0)
    })
  })

  describe('agent-config:upsert', () => {
    it('插入或更新 agent 配置', async () => {
      const handler = getHandler('agent-config:upsert')
      const result = (await handler(null, {
        key: 'classify',
        config: { temperature: 0.5, maxTokens: 100, prompt: 'test' }
      })) as { code: number }
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

    it('返回对话列表', async () => {
      const handler = getHandler('conversation:list')
      const result = (await handler()) as { code: number; data: unknown }
      expect(result.code).toBe(0)
    })
  })

  describe('conversation:getById', () => {
    it('返回指定对话', async () => {
      const handler = getHandler('conversation:getById')
      const result = (await handler(null, { chatId: 'chat-1' })) as {
        code: number
        data: unknown
      }
      expect(result.code).toBe(0)
    })
  })

  describe('conversation:createOrUpdate', () => {
    it('创建或更新对话', async () => {
      const handler = getHandler('conversation:createOrUpdate')
      const result = (await handler(null, {
        chatInfo: { userName: 'test-user', itemId: 'p1' },
        messages: []
      })) as { code: number; data: unknown }
      expect(result.code).toBe(0)
    })
  })

  describe('conversation:delete', () => {
    it('删除对话', async () => {
      const handler = getHandler('conversation:delete')
      const result = (await handler(null, { chatId: 'chat-1' })) as { code: number }
      expect(result.code).toBe(0)
    })
  })

  describe('reply-queue:dequeue', () => {
    it('出队', async () => {
      const handler = getHandler('reply-queue:dequeue')
      const result = (await handler()) as { code: number; data: string | null }
      expect(result.code).toBe(0)
    })
  })

  describe('reply-queue:enqueue', () => {
    it('成功追加消息并入队', async () => {
      const handler = getHandler('reply-queue:enqueue')
      const result = (await handler(null, {
        chatId: 'chat-1',
        content: '你好'
      })) as { code: number }
      expect(result.code).toBe(0)
    })

    it('入队失败时仍返回成功（幂等 chatId）', async () => {
      const handler = getHandler('reply-queue:enqueue')

      // 第一次入队
      const result1 = (await handler(null, {
        chatId: 'chat-1',
        content: '消息1'
      })) as { code: number }
      expect(result1.code).toBe(0)

      // 第二次入队相同 chatId（幂等失败，但 handler 仍然返回 ok）
      const result2 = (await handler(null, {
        chatId: 'chat-1',
        content: '消息2'
      })) as { code: number }
      expect(result2.code).toBe(0)
    })
  })

  describe('conversation:upsert', () => {
    it('处理新用户消息', async () => {
      const handler = getHandler('conversation:upsert')
      const result = (await handler(null, {
        chatInfo: { userName: 'test-user', itemId: 'item-123' },
        messages: []
      })) as { code: number }
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
      const handler = getHandler('simulate:click')

      // 模拟事件对象
      const mockEvent = { sender: 'mock-sender' }

      // 调用 handler（异步）
      await handler(mockEvent, 100, 200)

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

      const handler = getHandler('simulate:click')

      const mockEvent = { sender: 'mock-sender' }

      // 返回错误对象但不抛出异常
      const result = await handler(mockEvent, 100, 200)
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
      const handler = getHandler('simulate:chinese-input')

      const mockEvent = { sender: 'mock-sender' }
      const result = (await handler(mockEvent, '你好世界')) as { code: number }

      expect(result.code).toBe(0)
      expect(mockWebContents.insertText).toHaveBeenCalled()
    })

    it('BrowserWindow 不存在时返回错误', async () => {
      const { BrowserWindow } = await import('electron')
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValueOnce(null)

      const handler = getHandler('simulate:chinese-input')

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
      const handler = getHandler('simulate:enter-key')

      const mockEvent = { sender: 'mock-sender' }
      const result = (await handler(mockEvent, { x: 100, y: 200 })) as { code: number }

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

      const handler = getHandler('simulate:enter-key')

      const mockEvent = { sender: 'mock-sender' }
      const result = await handler(mockEvent, { x: 100, y: 200 })

      expect(result).toEqual({ code: 3002, message: '窗口不存在', data: null })
    })
  })

  describe('document:list', () => {
    it('返回文档标题列表', async () => {
      const handler = getHandler('document:list')
      const result = (await handler()) as { code: number; data: unknown }
      expect(result.code).toBe(0)
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('document:get', () => {
    it('返回指定文档内容', async () => {
      const handler = getHandler('document:get')
      const result = (await handler(null, { key: '售后说明' })) as {
        code: number
        data: unknown
      }
      expect(result.code).toBe(0)
    })
  })

  describe('document:upsert', () => {
    it('创建或更新文档', async () => {
      const handler = getHandler('document:upsert')
      const result = (await handler(null, {
        key: '新文档',
        content: '新内容'
      })) as { code: number; data: unknown }
      expect(result.code).toBe(0)
    })
  })

  describe('document:delete', () => {
    it('删除文档', async () => {
      const handler = getHandler('document:delete')
      const result = (await handler(null, { key: '售后说明' })) as { code: number }
      expect(result.code).toBe(0)
    })
  })
})
