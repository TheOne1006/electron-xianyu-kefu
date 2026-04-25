/**
 * 对话历史管理器
 *
 * 使用 electron-store 存储每个聊天会话的对话历史，
 * key 为 chatId（通过 buildChatId 生成）。
 *
 * 每个 userName + itemId 对应一个独立的记录。
 */

import Store from 'electron-store'
import { consola } from 'consola'
import type { Conversation } from '../../shared/types'
import { safeId, getStoreCwd } from './helper'

const logger = consola.withTag('conversation-store')

// ─── Store 实例 ─────────────────────────────────────────────

const store = new Store<Record<string, Conversation>>({
  name: 'conversations',
  cwd: getStoreCwd()
})

// ─── 工具函数 ─────────────────────────────────────────────

/** 生成 chatId：userName_itemId */
export function buildChatId(userName: string, itemId: string): string {
  return safeId(`${userName}_${itemId}`)
}

// ─── CRUD 方法 ─────────────────────────────────────────────

/**
 * 创建或更新对话
 * 如果已存在则更新
 */
export function createOrUpdate(packet: Conversation): Conversation {
  const chatId = buildChatId(packet.chatInfo.userName, packet.chatInfo.itemId)
  store.set(chatId, packet)
  logger.info(`保存对话: ${chatId}`)
  return packet
}

/**
 * 按 ID 获取对话（read）
 */
export function getById(chatId: string): Conversation | null {
  const id = safeId(chatId)
  return store.get(id) ?? null
}

/**
 * 追加消息到对话（update）
 * 对话不存在则报错
 */
export function appendMessage(
  chatId: string,
  message: string,
  isSelf: boolean = true
): Conversation {
  const id = safeId(chatId)
  const existing = store.get(id)

  if (!existing) {
    throw new Error(`对话不存在: ${chatId}`)
  }

  existing.messages.push({ type: 'text', content: message, sender: 'user', isSelf })
  store.set(id, existing)
  return existing
}

/**
 * 列出所有对话（list）
 */
export function list(): Conversation[] {
  const keys = store.size > 0 ? Object.keys(store.store) : []
  return keys.map((key) => store.store[key])
}

/**
 * 删除对话（delete）
 */
export function deleteById(chatId: string): boolean {
  const id = safeId(chatId)
  const existing = store.get(id)
  if (!existing) return false
  store.delete(id)
  logger.info(`删除对话: ${id}`)
  return true
}
