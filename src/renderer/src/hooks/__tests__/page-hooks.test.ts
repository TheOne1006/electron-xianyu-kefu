import { describe, expect, it } from 'vitest'
import type { AgentConfig, Product } from '@shared/types'
import { buildProductRows } from '../useProductsPage'
import { createAgentConfigs, DEFAULT_AGENT_CONFIGS } from '../useAgentConfigs'

describe('buildProductRows', () => {
  it('只保留存在于文档映射中的关联文档标题', () => {
    const products: Product[] = [
      {
        id: 'p1',
        title: '测试商品',
        content: '描述',
        images: [],
        mainImageUrl: '',
        documentKeys: ['文档A', '文档B', '缺失文档']
      }
    ]

    const rows = buildProductRows(products, {
      文档A: '内容A',
      文档B: '内容B'
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?._documentTitles).toEqual(['文档A', '文档B'])
  })
})

describe('createAgentConfigs', () => {
  it('在缺少部分 Agent 配置时回退到默认值', () => {
    const partialConfigs: Partial<Record<'system' | 'tech', AgentConfig>> = {
      system: {
        prompt: 'system prompt',
        temperature: 0.2,
        maxTokens: 512
      }
    }

    const configs = createAgentConfigs(partialConfigs)

    expect(configs.system).toEqual(partialConfigs.system)
    expect(configs.tech).toEqual(DEFAULT_AGENT_CONFIGS.tech)
    expect(configs.default).toEqual(DEFAULT_AGENT_CONFIGS.default)
  })
})
