/**
 * conversation-store 完整测试覆盖
 *
 * 测试 conversation-store.ts 的所有导出函数：
 * buildChatId, createOrUpdate, getById, appendMessage, list, deleteById
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { resetMockStoreData } from '../mock-electron-store'
import type { Conversation } from '../../../shared/types'

// Mock product-store 避免 conversation-store 测试时触发商品查询
vi.mock('../../stores/product-store', () => ({
  getById: vi.fn()
}))

// 延迟导入以应用 mock
const { buildChatId, createOrUpdate, getById, appendMessage, list, deleteById } =
  await import('../../stores/conversation-store')

// Mock 数据
const mockConversation: Conversation = {
  chatInfo: { userName: 'testUser', itemId: 'item001', isMyProduct: false },
  messages: []
}

beforeEach(async () => {
  resetMockStoreData()
  const { getById } = await import('../../stores/product-store')
  vi.mocked(getById).mockReturnValue({
    id: 'item001',
    title: '测试商品',
    content: '测试描述',
    priceStrategy: '100元',
    stock: 10,
    images: [],
    mainImageUrl: '',
    documentKeys: []
  })
})

describe('conversation-store', () => {
  describe('buildChatId', () => {
    it('生成格式正确的 chatId', () => {
      const chatId = buildChatId('user1', 'item123')
      // chatId 应该经过 safeId 处理（特殊字符被清理）
      expect(typeof chatId).toBe('string')
      expect(chatId.length).toBeGreaterThan(0)
    })

    it('相同输入生成相同 chatId', () => {
      const chatId1 = buildChatId('user1', 'item123')
      const chatId2 = buildChatId('user1', 'item123')
      expect(chatId1).toBe(chatId2)
    })
  })

  describe('createOrUpdate', () => {
    it('创建新对话并返回', () => {
      const result = createOrUpdate(mockConversation)
      expect(result).toEqual(mockConversation)
    })

    it('已存在则更新对话', () => {
      createOrUpdate(mockConversation)
      const updated = {
        ...mockConversation,
        chatInfo: { ...mockConversation.chatInfo, userName: 'updatedUser' }
      }
      const result = createOrUpdate(updated)
      expect(result.chatInfo.userName).toBe('updatedUser')
    })

    describe('createOrUpdate 产品校验', () => {
      it('产品不存在时抛出错误', async () => {
        const { getById } = await import('../../stores/product-store')
        vi.mocked(getById).mockReturnValue(null)
        expect(() => createOrUpdate(mockConversation)).toThrow('产品 item001 不存在')
      })

      it('产品存在时正常创建', async () => {
        const { getById } = await import('../../stores/product-store')
        vi.mocked(getById).mockReturnValue({
          id: 'item001',
          title: '测试商品',
          content: '测试描述',
          priceStrategy: '100元',
          stock: 10,
          images: [],
          mainImageUrl: '',
          documentKeys: []
        })
        const result = createOrUpdate(mockConversation)
        expect(result).toEqual(mockConversation)
      })
    })
  })

  describe('getById', () => {
    it('获取存在的对话', () => {
      createOrUpdate(mockConversation)
      const chatId = buildChatId(
        mockConversation.chatInfo.userName,
        mockConversation.chatInfo.itemId
      )
      const result = getById(chatId)
      expect(result).toEqual(mockConversation)
    })

    it('获取不存在的对话返回 null', () => {
      const result = getById('nonexistent_chat_id')
      expect(result).toBeNull()
    })
  })

  describe('appendMessage', () => {
    it('追加消息到存在的对话', () => {
      createOrUpdate(mockConversation)
      const chatId = buildChatId(
        mockConversation.chatInfo.userName,
        mockConversation.chatInfo.itemId
      )
      const result = appendMessage(chatId, 'hello')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].type).toBe('text')
      expect(result.messages[0].content).toBe('hello')
      expect(result.messages[0].sender).toBe('user')
      expect(result.messages[0].isSelf).toBe(true)
    })

    it('追加到不存在的对话抛出错误', () => {
      expect(() => appendMessage('nonexistent_chat', 'hello')).toThrow('对话不存在:')
    })
  })

  describe('list', () => {
    it('返回所有对话', () => {
      createOrUpdate(mockConversation)
      const anotherConversation: Conversation = {
        chatInfo: { userName: 'user2', itemId: 'item002', isMyProduct: false },
        messages: []
      }
      createOrUpdate(anotherConversation)

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
    it('删除存在的对话返回 true', () => {
      createOrUpdate(mockConversation)
      const chatId = buildChatId(
        mockConversation.chatInfo.userName,
        mockConversation.chatInfo.itemId
      )
      const result = deleteById(chatId)
      expect(result).toBe(true)

      const afterDelete = getById(chatId)
      expect(afterDelete).toBeNull()
    })

    it('删除不存在的对话返回 false', () => {
      const result = deleteById('nonexistent_chat_id')
      expect(result).toBe(false)
    })
  })
})
