import { registerAgentConfigHandlers } from './ipc/agent-config-handlers'
import { registerAutomationHandlers } from './ipc/automation-handlers'
import { registerConversationHandlers } from './ipc/conversation-handlers'
import { registerCoreHandlers } from './ipc/core-handlers'
import { registerDocumentHandlers } from './ipc/document-handlers'
import { registerProductHandlers } from './ipc/product-handlers'
import { registerReplyQueueHandlers } from './ipc/reply-queue-handlers'

/**
 * 注册所有 IPC 通道处理器
 * 在 app.whenReady() 后调用一次
 */
export function registerIpcHandlers(): void {
  registerCoreHandlers()
  registerConversationHandlers()
  registerReplyQueueHandlers()
  registerAgentConfigHandlers()
  registerProductHandlers()
  registerDocumentHandlers()
  registerAutomationHandlers()
}
