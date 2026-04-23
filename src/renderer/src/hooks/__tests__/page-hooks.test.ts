import { describe, expect, it } from 'vitest'
import type { AgentConfig, Product } from '@shared/types'
import {
  createConfigsPageState,
  parseKeywordInput,
  stringifyKeywordInput
} from '@renderer/pages/configs-page-model'
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

describe('createConfigsPageState', () => {
  it('在后端返回部分配置时使用共享默认值补齐缺失字段', () => {
    const state = createConfigsPageState({
      humanTakeoverKeywords: '',
      safetyFilterBlockedKeywords: ['  微信  ', '', 'QQ'],
      browserUrl: ''
    })

    expect(state.config.model).toBe('MiniMax-M2.7')
    expect(state.config.baseURL).toBe('https://api.minimaxi.com/v1')
    expect(state.config.humanTakeoverKeywords).toBe('')
    expect(state.config.browserUrl).toBe('')
    expect(state.config.safetyFilterReplacement).toBe('**')
    expect(state.config.orderWebhookUrl).toBe('')
    expect(state.config.safetyFilterBlockedKeywords).toEqual(['微信', 'QQ'])
    expect(state.keywordInput).toBe('微信, QQ')
  })
})

describe('parseKeywordInput', () => {
  it('按中英文逗号切分、去空白并去重', () => {
    expect(parseKeywordInput(' 微信, QQ，  微信 ,, 支付宝转账  ')).toEqual([
      '微信',
      'QQ',
      '支付宝转账'
    ])
  })

  it('将关键词数组格式化为稳定的输入框字符串', () => {
    expect(stringifyKeywordInput(['微信', 'QQ', '支付宝转账'])).toBe('微信, QQ, 支付宝转账')
  })
})
