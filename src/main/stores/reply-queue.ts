/**
 * 回复队列管理器
 *
 * 使用 electron-store 存储待发送回复的队列。
 * 每个条目包含 chatId + replyText，确保出队时使用原始回复内容。
 * 队列顺序即发送优先级。
 */

import Store from 'electron-store'
import { consola } from 'consola'

const logger = consola.withTag('reply-queue')

// ─── 类型定义 ─────────────────────────────────────────────

export interface QueueItem {
  chatId: string
  replyText: string
}

// ─── Store 实例 ─────────────────────────────────────────────

interface ReplyQueueStore {
  queue: QueueItem[]
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
export function enqueue(chatId: string, replyText: string): { success: boolean; error?: string } {
  const queue = store.get('queue') ?? []

  if (queue.some((item) => item.chatId === chatId)) {
    logger.info(`[队列] 已存在，跳过: ${chatId}`)
    return { success: true }
  }

  queue.push({ chatId, replyText })
  store.set('queue', queue)
  logger.info(`[队列] 加入: ${chatId}`)
  return { success: true }
}

/**
 * 从队列移除并返回第一个条目
 * 队列为空时返回 null
 */
export function dequeue(): QueueItem | null {
  const queue = store.get('queue') ?? []
  const item = queue.shift() ?? null
  if (item !== null) {
    store.set('queue', queue)
    logger.info(`[队列] 移除: ${item.chatId}`)
  }
  return item
}

/**
 * 获取队列第一个条目，不删除
 */
export function getFirst(): QueueItem | null {
  const queue = store.get('queue') ?? []
  return queue[0] ?? null
}

/**
 * 按 chatId 从队列中移除条目
 * 用于 direct push 成功后清除残留的队列条目
 */
export function removeByChatId(chatId: string): boolean {
  const queue = store.get('queue') ?? []
  const index = queue.findIndex((item) => item.chatId === chatId)
  if (index === -1) return false

  queue.splice(index, 1)
  store.set('queue', queue)
  logger.info(`[队列] 按 chatId 移除: ${chatId}`)
  return true
}
