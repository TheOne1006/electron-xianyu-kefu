import { ipcMain } from 'electron'
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

const logger = consola.withTag('ipc:conversation')

export function registerConversationHandlers(): void {
  ipcMain.handle('conversation:upsert', async (_event, data: Conversation) => {
    try {
      await handleNewUserMessage(data)
      return ok(null)
    } catch (error) {
      logger.error('处理消息失败:', error)
      return err(1003, '处理消息失败')
    }
  })

  ipcMain.handle('conversation:list', () => {
    return ok(listConversations())
  })

  ipcMain.handle('conversation:getById', (_event, { chatId }: { chatId: string }) => {
    return ok(getConversationById(chatId))
  })

  ipcMain.handle('conversation:createOrUpdate', (_event, data: Conversation) => {
    return ok(createOrUpdateConversation(data))
  })

  ipcMain.handle('conversation:delete', (_event, { chatId }: { chatId: string }) => {
    return ok(deleteConversation(chatId))
  })
}
