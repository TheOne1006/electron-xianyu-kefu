/**
 * 回复队列管理器
 *
 * 使用 electron-store 存储待发送回复的 chatId 队列。
 * 队列顺序即发送优先级。
 */

import Store from 'electron-store'
import { consola } from 'consola'

const logger = consola.withTag('reply-queue')

// ─── Store 实例 ─────────────────────────────────────────────

interface ReplyQueueStore {
  queue: string[] // chatId 队列
}

const store = new Store<ReplyQueueStore>({
  name: 'reply-queue',
  defaults: {
    queue: []
  }
})

// ─── 队列操作函数 ─────────────────────────────────────────────

/**
 * 加入队列
 * 重复的 chatId 会被忽略
 */
export function enqueue(chatId: string): { success: boolean; error?: string } {
  const queue = store.get('queue') ?? []

  if (queue.includes(chatId)) {
    logger.info(`[队列] 已存在，跳过: ${chatId}`)
    return { success: true }
  }

  queue.push(chatId)
  store.set('queue', queue)
  logger.info(`[队列] 加入: ${chatId}`)
  return { success: true }
}

/**
 * 从队列移除并返回第一个 chatId
 * 队列为空时返回 null
 */
export function dequeue(): string | null {
  const queue = store.get('queue') ?? []
  const chatId = queue.shift() ?? null
  if (chatId !== null) {
    store.set('queue', queue)
    logger.info(`[队列] 移除: ${chatId}`)
  }
  return chatId
}

/**
 * 获取队列第一个 chatId，不删除
 */
export function getFirst(): string | null {
  const queue = store.get('queue') ?? []
  return queue[0] ?? null
}
