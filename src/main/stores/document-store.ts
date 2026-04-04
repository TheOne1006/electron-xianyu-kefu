/**
 * 知识片段存储管理器
 *
 * 使用 electron-store 存储文档片段，
 * key 为中文标题，value 为纯文本内容。
 */

import Store from 'electron-store'
import { consola } from 'consola'
import defaultDocuments from '@shared/defaults/documents/001.json'

const logger = consola.withTag('document-store')

// ─── Store 实例 ─────────────────────────────────────────────

const StoreClass = (Store as unknown as { default: typeof Store }).default || Store

const store = new StoreClass<Record<string, string>>({
  name: 'documents',
  defaults: defaultDocuments as Record<string, string>
})

// ─── CRUD 方法 ─────────────────────────────────────────────

/**
 * 列出所有文档标题
 */
export function listDocuments(): string[] {
  return store.size > 0 ? Object.keys(store.store) : []
}

/**
 * 获取单个文档内容
 */
export function getDocument(key: string): string | undefined {
  return store.get(key)
}

/**
 * 获取所有文档
 */
export function getAllDocuments(): Record<string, string> {
  return store.store as Record<string, string>
}

/**
 * 创建或更新文档
 */
export function upsertDocument(key: string, content: string): void {
  store.set(key, content)
  logger.info(`保存文档: ${key}`)
}

/**
 * 删除文档
 */
export function deleteDocument(key: string): void {
  store.delete(key)
  logger.info(`删除文档: ${key}`)
}

/**
 * 批量查询文档内容
 * - 过滤空字符串和 undefined 的 key
 * - 忽略不存在的 key
 * - 空数组输入返回空对象
 */
export function getDocumentsByKeys(keys: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of keys) {
    if (!key) continue
    const content = store.get(key)
    if (content !== undefined) {
      result[key] = content
    }
  }
  return result
}
