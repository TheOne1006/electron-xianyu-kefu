import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// mock electron-store（mock-electron-store.ts 会在测试运行时自动注入）
import { setMockStoreData, resetMockStoreData } from '../mock-electron-store'

// 导入真实函数（不再 mock safety-filter 模块）
import { filterSafety } from '../../business/safety-filter'

describe('filterSafety', () => {
  beforeEach(() => {
    // 每个用例前设置默认配置
  })

  afterEach(() => {
    resetMockStoreData()
  })

  it('命中敏感词时返回替换文本', () => {
    setMockStoreData({
      safetyFilterBlockedKeywords: ['微信', 'QQ'],
      safetyFilterReplacement: '**'
    })
    expect(filterSafety('加我微信聊')).toBe('**')
  })

  it('空敏感词列表不过滤', () => {
    setMockStoreData({
      safetyFilterBlockedKeywords: [],
      safetyFilterReplacement: '**'
    })
    expect(filterSafety('任何文本')).toBe('任何文本')
  })

  it('无敏感词时原样返回', () => {
    setMockStoreData({
      safetyFilterBlockedKeywords: ['微信'],
      safetyFilterReplacement: '**'
    })
    expect(filterSafety('你好，这个还在吗？')).toBe('你好，这个还在吗？')
  })

  it('命中第二个敏感词也返回替换', () => {
    setMockStoreData({
      safetyFilterBlockedKeywords: ['微信', 'QQ', '支付宝'],
      safetyFilterReplacement: '**'
    })
    expect(filterSafety('加我QQ吧')).toBe('**')
  })
})
