import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetMockStoreData, setMockStoreData } from '../mock-electron-store'

// 确保 mock 在导入之前就已经设置好了
// 使用 dynamic import 延迟导入
let enqueue: (chatId: string) => { success: boolean; error?: string }
let dequeue: () => string | null
let getFirst: () => string | null

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
})

describe('reply-queue', () => {
  describe('enqueue', () => {
    it('成功加入新 chatId', () => {
      const result = enqueue('chat-001')
      expect(result.success).toBe(true)
    })

    it('重复 chatId 跳过并返回成功', () => {
      enqueue('chat-002')
      const result = enqueue('chat-002')
      expect(result.success).toBe(true)
    })

    it('不同 chatId 可以同时存在', () => {
      enqueue('chat-003')
      const result = enqueue('chat-004')
      expect(result.success).toBe(true)
    })
  })

  describe('dequeue', () => {
    it('成功移除并返回队首 chatId', () => {
      enqueue('chat-100')
      const result = dequeue()
      expect(result).toBe('chat-100')
    })

    it('移除后 chatId 不在队列中', () => {
      enqueue('chat-101')
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
      enqueue('chat-first')
      enqueue('chat-second')
      expect(getFirst()).toBe('chat-first')
      expect(getFirst()).toBe('chat-first')
    })
  })

  describe('队列顺序', () => {
    it('FIFO 顺序', () => {
      enqueue('c1')
      enqueue('c2')
      enqueue('c3')
      expect(getFirst()).toBe('c1')
      expect(dequeue()).toBe('c1')
      expect(getFirst()).toBe('c2')
      expect(dequeue()).toBe('c2')
      expect(getFirst()).toBe('c3')
    })
  })
})
