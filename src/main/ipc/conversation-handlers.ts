import { consola } from 'consola'

import { handleNewUserMessage } from '../business/agent'
import {
  getById as getConversationById,
  createOrUpdate as createOrUpdateConversation,
  deleteById as deleteConversation,
  list as listConversations
} from '../stores/conversation-store'
import type { Conversation } from '../../shared/types'
import { err, ok } from '../ipc-response'
import { safeHandle } from './safe-handle'

const logger = consola.withTag('ipc:conversation')

export function registerConversationHandlers(): void {
  safeHandle('conversation:upsert', async (_event, data: Conversation) => {
    try {
      await handleNewUserMessage(data)
      return ok(null)
    } catch (error) {
      logger.error('处理消息失败:', error)
      return err(1003, '处理消息失败')
    }
  })

  safeHandle('conversation:list', () => {
    return ok(listConversations())
  })

  safeHandle('conversation:getById', (_event, { chatId }: { chatId: string }) => {
    return ok(getConversationById(chatId))
  })

  safeHandle('conversation:createOrUpdate', (_event, data: Conversation) => {
    const result = createOrUpdateConversation(data)
    logger.info(`[createOrUpdate] 会话已更新: ${data.chatInfo.userName}`)
    return ok(result)
  })

  safeHandle('conversation:delete', (_event, { chatId }: { chatId: string }) => {
    deleteConversation(chatId)
    logger.info(`[delete] 会话已删除: ${chatId}`)
    return ok(null)
  })
}
