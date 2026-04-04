import { describe, it, expect, beforeEach } from 'vitest'
import { resetMockStoreData, setMockStoreData } from '../mock-electron-store'

// 初始化 agent-config-store 所需的默认数据
const mockAgentsData = {
  classify: { temperature: 0.1, maxTokens: 20, prompt: 'classify prompt' },
  price: { temperature: 0.4, maxTokens: 500, prompt: 'price prompt' },
  tech: { temperature: 0.4, maxTokens: 500, prompt: 'tech prompt' },
  default: { temperature: 0.7, maxTokens: 500, prompt: 'default prompt' }
}

const { getAgentConfig, getAllAgentConfigs } =
  await import('../../../main/stores/agent-config-store')

beforeEach(() => {
  resetMockStoreData()
  setMockStoreData(mockAgentsData as Record<string, unknown>)
})

describe('agent-config-store', () => {
  describe('getAgentConfig', () => {
    it('返回 classify agent 配置', () => {
      const config = getAgentConfig('classify')
      expect(config).toBeDefined()
      expect(config?.temperature).toBe(0.1)
      expect(config?.maxTokens).toBe(20)
      expect(config?.prompt).toBe('classify prompt')
    })

    it('返回 price agent 配置', () => {
      const config = getAgentConfig('price')
      expect(config).toBeDefined()
      expect(config?.temperature).toBe(0.4)
      expect(config?.maxTokens).toBe(500)
    })

    it('返回 default agent 配置', () => {
      const config = getAgentConfig('default')
      expect(config).toBeDefined()
      expect(config?.temperature).toBe(0.7)
      expect(config?.maxTokens).toBe(500)
    })
  })

  describe('getAllAgentConfigs', () => {
    it('返回全部 4 个 agent 配置', () => {
      const configs = getAllAgentConfigs()
      expect(Object.keys(configs)).toEqual(['classify', 'price', 'tech', 'default'])
    })
  })
})
