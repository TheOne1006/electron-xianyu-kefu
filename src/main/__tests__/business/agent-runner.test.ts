import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatCompletion } from 'openai/resources/chat/completions'

// 引入 setup.ts 以触发 electron-store 等基础 mock 注册
import '../../__tests__/setup'

// Mock 数据 - 直接内联避免引用问题
const mockAppConfig = {
  apiKey: 'test-key',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  humanTakeoverKeywords: '',
  safetyFilterBlockedKeywords: [] as string[],
  safetyFilterReplacement: ''
}

// OpenAI mock
const mockCreate = vi.fn()
vi.mock('openai', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    default: function MockOpenAI(_opts: { apiKey: string; baseURL: string }) {
      return {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }
    }
  }
})

// Safety-filter mock
vi.mock('../../business/safety-filter', () => ({
  filterSafety: vi.fn<(s: string) => string>()
}))

// 动态导入以确保 mock 已生效
import { setMockStoreData, resetMockStoreData } from '../../__tests__/mock-electron-store'
import { runAgent } from '../../../main/business/agent-runner'
import { filterSafety } from '../../../main/business/safety-filter'

describe('runAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockReset()

    // 重置并设置 mock store 数据
    // 注意: 必须在 store 模块导入之后调用
    // app-config-store 存储在根级别（store.store === AppConfig）
    // agent-config-store 存储在各自 key 下（store.get('classify') === AgentConfig）
    resetMockStoreData()
    setMockStoreData({
      ...mockAppConfig, // app-config-store 直接存储 AppConfig 属性
      classify: { temperature: 0.1, maxTokens: 20, prompt: 'classify prompt' },
      price: { temperature: 0.4, maxTokens: 500, prompt: 'price prompt' },
      tech: { temperature: 0.4, maxTokens: 500, prompt: 'tech prompt' },
      default: { temperature: 0.7, maxTokens: 500, prompt: 'default prompt' },
      system: { temperature: 0.7, maxTokens: 500, prompt: 'system prompt' }
    })
    ;(filterSafety as ReturnType<typeof vi.fn>).mockImplementation((s) => s)
  })

  it('未知 agent 抛出错误', async () => {
    // 清空所有 agent 配置
    resetMockStoreData()
    setMockStoreData({
      ...mockAppConfig
      // 不设置任何 agent 配置
    })

    await expect(
      runAgent(
        'unknown' as 'system',
        { id: '', title: '', images: [], mainImageUrl: '', documentKeys: [] },
        []
      )
    ).rejects.toThrow()
  })

  it('classify agent 正确构建 prompt 并调用 chat', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '好的' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    const result = await runAgent(
      'classify',
      { id: '', title: '耳机', images: [], mainImageUrl: '', documentKeys: [] },
      [{ type: 'text', sender: '用户', isSelf: false, content: '便宜点' }]
    )

    expect(mockCreate).toHaveBeenCalled()
    expect(result).toBe('好的')
  })

  it('price agent 使用正确的 temperature', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '可以便宜' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 }
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    await runAgent(
      'price',
      { id: '', title: '耳机', images: [], mainImageUrl: '', documentKeys: [] },
      [{ type: 'text', sender: '用户', isSelf: false, content: '能便宜吗' }]
    )

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0.4 }))
  })

  it('API 返回空内容时抛出错误', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 }
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    await expect(
      runAgent('default', { id: '', title: '', images: [], mainImageUrl: '', documentKeys: [] }, [])
    ).rejects.toThrow('API 返回内容为空')
  })

  it('安全过滤被调用', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '危险内容' },
          finish_reason: 'stop'
        }
      ],
      usage: undefined
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    await runAgent(
      'default',
      { id: '', title: '', images: [], mainImageUrl: '', documentKeys: [] },
      []
    )

    expect(filterSafety).toHaveBeenCalledWith('危险内容')
  })

  it('包含商品信息时正确构建 system prompt', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '回复' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    await runAgent(
      'default',
      {
        id: 'p1',
        title: '耳机',
        priceStrategy: '原价',
        content: '二手',
        images: [],
        mainImageUrl: '',
        documentKeys: []
      },
      []
    )

    // 验证 system message 包含商品信息
    const createCall = mockCreate.mock.calls[0][0]
    const systemMessage = createCall.messages.find((m: { role: string }) => m.role === 'system')
    expect(systemMessage.content).toContain('耳机')
    expect(systemMessage.content).toContain('原价')
  })

  it('商品有关联文档时注入文档内容到 prompt', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '回复' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    // 设置文档内容到 store
    setMockStoreData({
      ...mockAppConfig,
      classify: { temperature: 0.1, maxTokens: 20, prompt: 'classify prompt' },
      price: { temperature: 0.4, maxTokens: 500, prompt: 'price prompt' },
      tech: { temperature: 0.4, maxTokens: 500, prompt: 'tech prompt' },
      default: { temperature: 0.7, maxTokens: 500, prompt: 'default prompt' },
      system: { temperature: 0.7, maxTokens: 500, prompt: 'system prompt' },
      使用说明: '这是使用说明内容'
    })

    await runAgent(
      'default',
      {
        id: 'p1',
        title: '耳机',
        priceStrategy: '原价',
        content: '二手',
        images: [],
        mainImageUrl: '',
        documentKeys: ['使用说明']
      },
      []
    )

    const createCall = mockCreate.mock.calls[0][0]
    const systemMessage = createCall.messages.find((m: { role: string }) => m.role === 'system')
    expect(systemMessage.content).toContain('使用说明: 这是使用说明内容')
  })

  it('商品无关联文档时 prompt 保持不变', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '回复' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    await runAgent(
      'default',
      {
        id: 'p1',
        title: '耳机',
        images: [],
        mainImageUrl: '',
        documentKeys: []
      },
      []
    )

    const createCall = mockCreate.mock.calls[0][0]
    const systemMessage = createCall.messages.find((m: { role: string }) => m.role === 'system')
    expect(systemMessage.content).toBe('default prompt\n\n【商品信息】\n商品名称: 耳机')
  })

  it('部分文档缺失时只注入存在的文档', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '回复' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    setMockStoreData({
      ...mockAppConfig,
      classify: { temperature: 0.1, maxTokens: 20, prompt: 'classify prompt' },
      price: { temperature: 0.4, maxTokens: 500, prompt: 'price prompt' },
      tech: { temperature: 0.4, maxTokens: 500, prompt: 'tech prompt' },
      default: { temperature: 0.7, maxTokens: 500, prompt: 'default prompt' },
      system: { temperature: 0.7, maxTokens: 500, prompt: 'system prompt' },
      使用说明: '这是使用说明内容'
    })

    await runAgent(
      'default',
      {
        id: 'p1',
        title: '耳机',
        images: [],
        mainImageUrl: '',
        documentKeys: ['使用说明', '不存在的文档']
      },
      []
    )

    const createCall = mockCreate.mock.calls[0][0]
    const systemMessage = createCall.messages.find((m: { role: string }) => m.role === 'system')
    expect(systemMessage.content).toContain('使用说明: 这是使用说明内容')
    expect(systemMessage.content).not.toContain('不存在的文档')
  })

  it('文档内容为空时仍然注入', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '回复' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    setMockStoreData({
      ...mockAppConfig,
      classify: { temperature: 0.1, maxTokens: 20, prompt: 'classify prompt' },
      price: { temperature: 0.4, maxTokens: 500, prompt: 'price prompt' },
      tech: { temperature: 0.4, maxTokens: 500, prompt: 'tech prompt' },
      default: { temperature: 0.7, maxTokens: 500, prompt: 'default prompt' },
      system: { temperature: 0.7, maxTokens: 500, prompt: 'system prompt' },
      使用说明: ''
    })

    await runAgent(
      'default',
      {
        id: 'p1',
        title: '耳机',
        images: [],
        mainImageUrl: '',
        documentKeys: ['使用说明']
      },
      []
    )

    const createCall = mockCreate.mock.calls[0][0]
    const systemMessage = createCall.messages.find((m: { role: string }) => m.role === 'system')
    expect(systemMessage.content).toContain('使用说明: ')
  })

  it('对话历史正确映射角色', async () => {
    const mockCompletion: ChatCompletion = {
      id: 'chatcmpl-xxx',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '回复' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
    } as ChatCompletion

    mockCreate.mockResolvedValue(mockCompletion)

    await runAgent(
      'default',
      { id: '', title: '', images: [], mainImageUrl: '', documentKeys: [] },
      [
        { type: 'text', sender: '用户', isSelf: false, content: '买家消息' },
        { type: 'text', sender: '客服', isSelf: true, content: '客服消息' }
      ]
    )

    const createCall = mockCreate.mock.calls[0][0]
    const historyMessages = createCall.messages.filter((m: { role: string }) => m.role !== 'system')

    // isSelf=false (买家) → user, isSelf=true (客服) → assistant
    expect(historyMessages[0]).toEqual({ role: 'user', content: '买家消息' })
    expect(historyMessages[1]).toEqual({ role: 'assistant', content: '客服消息' })
  })

  it('API Key 未配置时抛出错误', async () => {
    // 清空所有配置，不设置 apiKey
    resetMockStoreData()
    setMockStoreData({
      // 不设置 apiKey 字段
      classify: { temperature: 0.1, maxTokens: 20, prompt: 'classify prompt' }
    })

    await expect(
      runAgent(
        'classify',
        { id: '', title: '', images: [], mainImageUrl: '', documentKeys: [] },
        []
      )
    ).rejects.toThrow('[LLMClient] API Key 未配置，请在设置中填写 API Key')
  })
})
