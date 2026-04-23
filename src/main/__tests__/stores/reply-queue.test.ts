import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetMockStoreData, setMockStoreData } from '../mock-electron-store'

// 确保 mock 在导入之前就已经设置好了
// 使用 dynamic import 延迟导入
let enqueue: (chatId: string, replyText: string) => { success: boolean; error?: string }
let dequeue: () => { chatId: string; replyText: string } | null
let getFirst: () => { chatId: string; replyText: string } | null
let removeByChatId: (chatId: string) => boolean

beforeEach(async () => {
  // 重置 storeData - 清空并设置 queue 为空数组
  resetMockStoreData()
  setMockStoreData({ queue: [] })
  vi.clearAllMocks()
  // 重新导入以获取新的模块引用
  const mod = await import('../../stores/reply-queue')
  enqueue = mod.enqueue
  dequeue = mod.dequeue
  getFirst = mod.getFirst
  removeByChatId = mod.removeByChatId
})

describe('reply-queue', () => {
  describe('enqueue', () => {
    it('成功加入新条目', () => {
      const result = enqueue('chat-001', '回复内容1')
      expect(result.success).toBe(true)
    })

    it('重复 chatId 跳过并返回成功', () => {
      enqueue('chat-002', '回复内容2')
      const result = enqueue('chat-002', '另一条回复')
      expect(result.success).toBe(true)
    })

    it('不同 chatId 可以同时存在', () => {
      enqueue('chat-003', '回复A')
      const result = enqueue('chat-004', '回复B')
      expect(result.success).toBe(true)
    })
  })

  describe('dequeue', () => {
    it('成功移除并返回队首条目', () => {
      enqueue('chat-100', '你好')
      const result = dequeue()
      expect(result).toEqual({ chatId: 'chat-100', replyText: '你好' })
    })

    it('移除后队列为空', () => {
      enqueue('chat-101', '测试')
      dequeue()
      expect(getFirst()).toBeNull()
    })

    it('空队列返回 null', () => {
      const result = dequeue()
      expect(result).toBeNull()
    })
  })

  describe('getFirst', () => {
    it('空队列返回 null', () => {
      expect(getFirst()).toBeNull()
    })

    it('返回队列第一个元素（不删除）', () => {
      enqueue('chat-first', '第一条')
      enqueue('chat-second', '第二条')
      expect(getFirst()).toEqual({ chatId: 'chat-first', replyText: '第一条' })
      expect(getFirst()).toEqual({ chatId: 'chat-first', replyText: '第一条' })
    })
  })

  describe('removeByChatId', () => {
    it('移除指定 chatId 的条目', () => {
      enqueue('chat-a', '回复A')
      enqueue('chat-b', '回复B')
      const removed = removeByChatId('chat-a')
      expect(removed).toBe(true)
      expect(getFirst()).toEqual({ chatId: 'chat-b', replyText: '回复B' })
    })

    it('chatId 不存在时返回 false', () => {
      const removed = removeByChatId('nonexistent')
      expect(removed).toBe(false)
    })
  })

  describe('队列顺序', () => {
    it('FIFO 顺序', () => {
      enqueue('c1', '回复1')
      enqueue('c2', '回复2')
      enqueue('c3', '回复3')
      expect(getFirst()).toEqual({ chatId: 'c1', replyText: '回复1' })
      expect(dequeue()).toEqual({ chatId: 'c1', replyText: '回复1' })
      expect(getFirst()).toEqual({ chatId: 'c2', replyText: '回复2' })
      expect(dequeue()).toEqual({ chatId: 'c2', replyText: '回复2' })
      expect(getFirst()).toEqual({ chatId: 'c3', replyText: '回复3' })
    })
  })
})
