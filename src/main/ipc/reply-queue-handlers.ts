import { ipcMain } from 'electron'
import { consola } from 'consola'

import { dequeue, enqueue } from '../stores/reply-queue'
import type { QueueItem } from '../stores/reply-queue'
import { appendMessage as appendConversationMessage } from '../stores/conversation-store'
import { err, ok } from '../ipc-response'

const logger = consola.withTag('ipc:reply-queue')

export function registerReplyQueueHandlers(): void {
  ipcMain.handle('reply-queue:dequeue', () => {
    const item: QueueItem | null = dequeue()
    if (item !== null) {
      logger.info(`[IPC] 回复队列需要发送给会话: ${item.chatId}`)
    }

    return ok({ chatId: item?.chatId ?? null, replyText: item?.replyText ?? null })
  })

  ipcMain.handle(
    'reply-queue:enqueue',
    (_event, { chatId, content }: { chatId: string; content: string }) => {
      try {
        appendConversationMessage(chatId, content)

        const queueResult = enqueue(chatId, content)
        if (!queueResult.success) {
          logger.warn(`[reply-queue:enqueue] 队列推送失败: ${queueResult.error}`)
        }

        return ok({ success: true })
      } catch (error) {
        logger.error(`[reply-queue:enqueue] 失败: ${error}`)
        return err(3, '发送失败')
      }
    }
  )
}
