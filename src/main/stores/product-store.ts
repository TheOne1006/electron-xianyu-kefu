/**
 * 产品存储管理器
 *
 * 使用 electron-store 存储每个产品的信息，
 * key 为产品 id。
 */

import Store from 'electron-store'
import { consola } from 'consola'
import type { Product } from '../../shared/types'
import { safeId } from './helper'
import { PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH } from '../../shared/constants'

const logger = consola.withTag('product-store')

// ─── Store 实例 ─────────────────────────────────────────────

const store = new Store<Record<string, Product>>({
  name: 'products'
})

// ─── CRUD 方法 ─────────────────────────────────────────────

/**
 * 创建或更新产品（createOrUpdate）
 * 如果已存在则更新
 */
export function createOrUpdate(product: Product): Product {
  const id = safeId(product.id)
  store.set(id, product)
  logger.info(`保存产品: ${id}`)
  return product
}

/**
 * 按 ID 获取产品（read）
 */
export function getById(id: string): Product | null {
  const safeProductId = safeId(id)
  return store.get(safeProductId) ?? null
}

/**
 * 列出所有产品（list）
 */
export function list(): Product[] {
  const keys = store.size > 0 ? Object.keys(store.store) : []
  return keys.map((key) => store.store[key])
}

/**
 * 删除产品（delete）
 */
export function deleteById(id: string): boolean {
  const safeProductId = safeId(id)
  const existing = store.get(safeProductId)
  if (!existing) return false
  store.delete(safeProductId)
  logger.info(`删除产品: ${safeProductId}`)
  return true
}

/**
 * 按主图 URL 获取产品（read）
 * 通过比较前 N 个字符判断是否为同一商品
 */
export function getByMainImage(imageUrl: string): Product | null {
  const compareLength = Math.min(imageUrl.length, PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH)
  const normalizedUrl = imageUrl.slice(0, compareLength)

  const keys = store.size > 0 ? Object.keys(store.store) : []
  for (const key of keys) {
    const product = store.store[key]
    if (!product.mainImageUrl) continue
    const productCompareLength = Math.min(
      product.mainImageUrl.length,
      PRODUCT_MAIN_IMAGE_URL_COMPARE_LENGTH
    )
    if (
      product.mainImageUrl.slice(0, productCompareLength) ===
      normalizedUrl.slice(0, productCompareLength)
    ) {
      return product
    }
  }
  return null
}
