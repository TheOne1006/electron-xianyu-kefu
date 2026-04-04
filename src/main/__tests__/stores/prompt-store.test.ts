import { describe, it, expect, beforeEach } from 'vitest'
import { resetMockStoreData, setMockStoreData } from '../mock-electron-store'

// 初始化 prompt-store 所需的默认数据（prompt 在 AgentConfig.prompt 中）
const mockAgentsData = {
  classify: { temperature: 0.1, maxTokens: 20, prompt: '默认分类提示词' },
  price: { temperature: 0.4, maxTokens: 500, prompt: '默认价格提示词' },
  tech: { temperature: 0.4, maxTokens: 500, prompt: '默认技术提示词' },
  default: { temperature: 0.7, maxTokens: 500, prompt: '默认回复提示词' }
}

const { getAgentConfig, getAllAgentConfigs } = await import('../../stores/agent-config-store')

beforeEach(() => {
  resetMockStoreData()
  setMockStoreData(mockAgentsData as Record<string, unknown>)
})

describe('prompt-store (agent-config-store)', () => {
  describe('getAgentConfig', () => {
    it('返回 classify 的 prompt 内容', () => {
      const config = getAgentConfig('classify')
      expect(config).toBeDefined()
      expect(config?.prompt).toBe('默认分类提示词')
    })

    it('每个 agent 都有 prompt', () => {
      const configs = getAllAgentConfigs()
      Object.values(configs).forEach((config) => {
        expect(typeof config.prompt).toBe('string')
        expect(config.prompt.length).toBeGreaterThan(0)
      })
    })
  })
})
