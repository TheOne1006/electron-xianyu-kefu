import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetMockStoreData, setMockStoreData } from '../mock-electron-store'

// 初始化 app-config-store 所需的默认数据
const mockAppConfig = {
  model: 'gpt-4o',
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'test-key',
  humanTakeoverKeywords: '',
  safetyFilterBlockedKeywords: [] as string[],
  safetyFilterReplacement: ''
}

// 延迟导入以应用 mock
const { appStore, getAppConfig, saveAppConfig } = await import('../../stores/app-config-store')

beforeEach(() => {
  vi.clearAllMocks()
  // 重置 store 数据
  resetMockStoreData()
  setMockStoreData({ ...mockAppConfig })
})

describe('app-config-store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('appStore', () => {
    it('appStore 存在且可访问', () => {
      expect(appStore).toBeDefined()
    })
  })

  describe('getAppConfig', () => {
    it('返回完整 AppConfig', () => {
      const config = getAppConfig()
      expect(config).toHaveProperty('model')
      expect(config).toHaveProperty('baseURL')
      expect(config).toHaveProperty('apiKey')
    })

    it('返回配置包含必需字段', () => {
      const config = getAppConfig()
      expect(typeof config.model).toBe('string')
      expect(typeof config.baseURL).toBe('string')
      expect(typeof config.apiKey).toBe('string')
    })
  })

  describe('saveAppConfig', () => {
    it('保存部分配置后能正确读取', () => {
      const original = getAppConfig()
      saveAppConfig({ apiKey: 'new-test-key' })
      const updated = getAppConfig()
      expect(updated.apiKey).toBe('new-test-key')
      expect(updated.model).toBe(original.model)
    })

    it('保存 safetyFilterBlockedKeywords', () => {
      saveAppConfig({ safetyFilterBlockedKeywords: ['微信', 'QQ'] })
      const config = getAppConfig()
      expect(config.safetyFilterBlockedKeywords).toContain('微信')
      expect(config.safetyFilterBlockedKeywords).toContain('QQ')
    })
  })
})
