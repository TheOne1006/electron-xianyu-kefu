import { describe, it, expect, beforeEach } from 'vitest'

// 引入 setup 以触发 mock 注册
import './setup'

import {
  listDocuments,
  getDocument,
  getAllDocuments,
  upsertDocument,
  deleteDocument
} from '../stores/document-store'
import { resetMockStoreData } from './mock-electron-store'

describe('document-store', () => {
  beforeEach(() => {
    resetMockStoreData()
  })

  describe('listDocuments', () => {
    it('空 store 返回空数组', () => {
      expect(listDocuments()).toEqual([])
    })

    it('返回所有文档标题', () => {
      upsertDocument('售后说明', '感谢您的购买')
      upsertDocument('物流模板', '快递默认发顺丰')
      const keys = listDocuments()
      expect(keys).toContain('售后说明')
      expect(keys).toContain('物流模板')
      expect(keys.length).toBe(2)
    })
  })

  describe('getDocument', () => {
    it('返回指定文档内容', () => {
      upsertDocument('产品介绍', '这是一款高品质的商品')
      expect(getDocument('产品介绍')).toBe('这是一款高品质的商品')
    })

    it('不存在的 key 返回 undefined', () => {
      expect(getDocument('不存在')).toBeUndefined()
    })
  })

  describe('getAllDocuments', () => {
    it('返回所有文档的 key-value 映射', () => {
      upsertDocument('售后说明', '感谢购买')
      upsertDocument('物流模板', '发顺丰')
      const all = getAllDocuments()
      expect(all['售后说明']).toBe('感谢购买')
      expect(all['物流模板']).toBe('发顺丰')
    })

    it('空 store 返回空对象', () => {
      const all = getAllDocuments()
      expect(Object.keys(all).length).toBe(0)
    })
  })

  describe('upsertDocument', () => {
    it('创建新文档', () => {
      upsertDocument('新文档', '新内容')
      expect(getDocument('新文档')).toBe('新内容')
    })

    it('更新已有文档', () => {
      upsertDocument('模板', '旧内容')
      upsertDocument('模板', '新内容')
      expect(getDocument('模板')).toBe('新内容')
    })
  })

  describe('deleteDocument', () => {
    it('删除存在的文档', () => {
      upsertDocument('待删除', '内容')
      deleteDocument('待删除')
      expect(getDocument('待删除')).toBeUndefined()
    })

    it('删除不存在的文档不报错', () => {
      expect(() => deleteDocument('不存在')).not.toThrow()
    })
  })
})
