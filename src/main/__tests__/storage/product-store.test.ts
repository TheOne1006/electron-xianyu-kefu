/**
 * product-store 完整测试覆盖
 *
 * 测试 product-store.ts 的所有导出函数：
 * createOrUpdate, getById, list, deleteById, getByMainImage
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { resetMockStoreData } from '../mock-electron-store'
import type { Product } from '../../../shared/types'
import { PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH } from '../../../shared/constants'

// 延迟导入以应用 mock
const { createOrUpdate, getById, list, deleteById, getByMainImage } =
  await import('../../stores/product-store')

// Mock 数据
const mockProduct: Product = {
  id: 'prod001',
  title: '测试商品',
  price: '99.9',
  content: '测试描述',
  images: ['https://example.com/images/product1.jpg', 'image2.jpg'],
  mainImageUrl: 'https://example.com/images/product1.jpg',
  documentKeys: []
}

beforeEach(() => {
  resetMockStoreData()
})

describe('product-store', () => {
  describe('createOrUpdate', () => {
    it('创建新产品并返回', () => {
      const result = createOrUpdate(mockProduct)
      expect(result).toEqual(mockProduct)
    })

    it('已存在则更新产品', () => {
      createOrUpdate(mockProduct)
      const updated = { ...mockProduct, title: '更新的商品标题' }
      const result = createOrUpdate(updated)
      expect(result.title).toBe('更新的商品标题')
    })
  })

  describe('getById', () => {
    it('获取存在的产品', () => {
      createOrUpdate(mockProduct)
      const result = getById('prod001')
      expect(result).toEqual(mockProduct)
    })

    it('获取不存在的产品返回 null', () => {
      const result = getById('nonexistent_product_id')
      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    it('返回所有产品', () => {
      createOrUpdate(mockProduct)
      const anotherProduct: Product = {
        id: 'prod002',
        title: '第二个商品',
        price: '199.9',
        images: [],
        mainImageUrl: '',
        documentKeys: []
      }
      createOrUpdate(anotherProduct)

      const result = list()
      expect(result).toHaveLength(2)
    })

    it('空 store 返回空数组', () => {
      resetMockStoreData()
      const result = list()
      expect(result).toEqual([])
    })
  })

  describe('deleteById', () => {
    it('删除存在的产品返回 true', () => {
      createOrUpdate(mockProduct)
      const result = deleteById('prod001')
      expect(result).toBe(true)

      const afterDelete = getById('prod001')
      expect(afterDelete).toBeNull()
    })

    it('删除不存在的产品返回 false', () => {
      const result = deleteById('nonexistent_product_id')
      expect(result).toBe(false)
    })
  })

  describe('getByMainImage', () => {
    it('精确匹配返回产品', () => {
      createOrUpdate(mockProduct)
      const result = getByMainImage('https://example.com/images/product1.jpg')
      expect(result).toEqual(mockProduct)
    })

    it('前 N 字符匹配返回产品', () => {
      createOrUpdate(mockProduct)
      // 使用前 72 个字符匹配
      const partialUrl = 'https://example.com/images/product1.jpg'.slice(
        0,
        PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH
      )
      const result = getByMainImage(partialUrl + '_extra_suffix')
      expect(result).toEqual(mockProduct)
    })

    it('无匹配返回 null', () => {
      createOrUpdate(mockProduct)
      const result = getByMainImage('https://other-domain.com/images/different.jpg')
      expect(result).toBeNull()
    })

    it('跳过 mainImageUrl 为 undefined 的产品', () => {
      const productWithoutMainImage: Product = {
        id: 'prod002',
        title: '无主图商品',
        images: ['image1.jpg'],
        mainImageUrl: '',
        documentKeys: []
      }
      createOrUpdate(productWithoutMainImage)
      createOrUpdate(mockProduct)

      const result = getByMainImage('https://example.com/images/product1.jpg')
      expect(result).toEqual(mockProduct)
    })

    it('短 URL 不足比较长度时使用实际长度比较', () => {
      const shortUrlProduct: Product = {
        id: 'prod003',
        title: '短URL商品',
        mainImageUrl: 'https://a.co/abc',
        images: [],
        documentKeys: []
      }
      createOrUpdate(shortUrlProduct)

      // URL 短于 PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH，应使用实际长度比较
      const result = getByMainImage('https://a.co/abc_def')
      expect(result).toEqual(shortUrlProduct)
    })
  })
})
