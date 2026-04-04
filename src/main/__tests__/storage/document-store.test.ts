/**
 * document-store 测试覆盖
 *
 * 测试 document-store.ts 的 getDocumentsByKeys 函数：
 * - 所有 key 都存在
 * - 部分 key 不存在
 * - 空数组输入
 * - 空 store
 * - 包含空字符串/undefined key
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { resetMockStoreData, setMockStoreData } from '../mock-electron-store'

// 延迟导入以应用 mock
const { getDocumentsByKeys } = await import('../../stores/document-store')

beforeEach(() => {
  resetMockStoreData()
})

describe('document-store', () => {
  describe('getDocumentsByKeys', () => {
    it('所有 key 都存在时返回完整映射', () => {
      setMockStoreData({
        使用说明: '这是使用说明内容',
        常见问题: '这是常见问题内容'
      })

      const result = getDocumentsByKeys(['使用说明', '常见问题'])
      expect(result).toEqual({
        使用说明: '这是使用说明内容',
        常见问题: '这是常见问题内容'
      })
    })

    it('部分 key 不存在时只返回存在的', () => {
      setMockStoreData({
        使用说明: '这是使用说明内容'
      })

      const result = getDocumentsByKeys(['使用说明', '不存在的文档'])
      expect(result).toEqual({
        使用说明: '这是使用说明内容'
      })
    })

    it('空数组输入返回空对象', () => {
      setMockStoreData({
        使用说明: '内容'
      })

      const result = getDocumentsByKeys([])
      expect(result).toEqual({})
    })

    it('空 store 返回空对象', () => {
      resetMockStoreData()

      const result = getDocumentsByKeys(['使用说明'])
      expect(result).toEqual({})
    })

    it('过滤空字符串 key', () => {
      setMockStoreData({
        使用说明: '内容'
      })

      const result = getDocumentsByKeys(['', '使用说明'])
      expect(result).toEqual({
        使用说明: '内容'
      })
    })

    it('文档内容为空字符串时仍然返回', () => {
      setMockStoreData({
        使用说明: '',
        常见问题: '有内容'
      })

      const result = getDocumentsByKeys(['使用说明', '常见问题'])
      expect(result).toEqual({
        使用说明: '',
        常见问题: '有内容'
      })
    })

    it('所有 key 都不存在返回空对象', () => {
      setMockStoreData({
        使用说明: '内容'
      })

      const result = getDocumentsByKeys(['不存在1', '不存在2'])
      expect(result).toEqual({})
    })
  })
})
