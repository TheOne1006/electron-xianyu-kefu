/**
 * 注入脚本统一类型定义
 *
 * 所有 injected 层内部使用的类型统一在此定义。
 * 共享类型从 shared/types.ts 导入。
 */

/** 闲鱼会话列表中的单项 */
export interface ChatListItem {
  type: 'user' | 'system' | 'unknown'
  userName: string
  lastMessage: string
  time: string
  hasUnread: boolean
  unreadCount: number
  itemImage: string
  hasItemImage: boolean
  tradeStatus: string
  dom: Element
}

/** ImRobot 状态机状态 */
export type AgentState = 'IDLE' | 'CHECKING' | 'PROCESSING_REPLY' | 'PROCESSING_COLLECT' | 'CLEANUP'

/** 主进程推送指令的结果 */
export interface CommandResult {
  success: boolean
  reason?: string
  state?: AgentState
}

/** 注入脚本暴露给主进程的命令接口 */
export interface RobotCommands {
  sendReply(chatId: string, replyText: string): Promise<CommandResult>
  getStatus(): { state: AgentState; lastActivity: number }
}
