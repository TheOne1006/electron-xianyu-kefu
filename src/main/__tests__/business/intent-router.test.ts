import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRunAgent =
  vi.fn<(agentKey: string, product: unknown, messages: unknown) => Promise<string>>()

vi.mock('../../business/agent-runner', () => ({
  runAgent: (...args: [string, unknown, unknown]) => mockRunAgent(...args)
}))

import { classifyIntent, mapIntentToAgent } from '../../business/intent-router'

describe('classifyIntent', () => {
  beforeEach(() => {
    mockRunAgent.mockReset()
  })

  it('技术类关键词直接返回 tech', async () => {
    const result = await classifyIntent('这个和另外那个比怎么样')
    expect(result).toBe('tech')
  })

  it('价格类关键词直接返回 price', async () => {
    const result = await classifyIntent('能便宜点吗')
    expect(result).toBe('price')
  })

  it('无匹配时调用 LLM 兜底', async () => {
    mockRunAgent.mockResolvedValue('bargain')
    const result = await classifyIntent('你好')
    expect(mockRunAgent).toHaveBeenCalledWith(
      'classify',
      { id: '', title: '', images: [], mainImageUrl: '', documentKeys: [] },
      expect.any(Array)
    )
    expect(result).toBe('bargain')
  })

  it('LLM 返回无效类别时降级为 other', async () => {
    mockRunAgent.mockResolvedValue('invalid')
    const result = await classifyIntent('你好')
    expect(result).toBe('other')
  })

  it('LLM 抛出异常时降级为 other', async () => {
    mockRunAgent.mockRejectedValue(new Error('API error'))
    const result = await classifyIntent('你好')
    expect(result).toBe('other')
  })
})

describe('mapIntentToAgent', () => {
  it('tech → tech', () => expect(mapIntentToAgent('tech')).toBe('tech'))
  it('price → price', () => expect(mapIntentToAgent('price')).toBe('price'))
  it('bargain → price', () => expect(mapIntentToAgent('bargain')).toBe('price'))
  it('inquiry → default', () => expect(mapIntentToAgent('inquiry')).toBe('default'))
  it('greeting → default', () => expect(mapIntentToAgent('greeting')).toBe('default'))
  it('order → default', () => expect(mapIntentToAgent('order')).toBe('default'))
  it('other → default', () => expect(mapIntentToAgent('other')).toBe('default'))
  it('未知 → default', () => expect(mapIntentToAgent('unknown')).toBe('default'))
})
