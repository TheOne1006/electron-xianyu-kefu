import type { AgentKey, ChatInfo, Conversation } from '../../shared/types'
import {
  buildChatId,
  createOrUpdate,
  appendMessage,
  getById as getConversationById
} from '../stores/conversation-store'
import { getById as getProductInfoById } from '../stores/product-store'
import { getAppConfig } from '../stores/app-config-store'
import { classifyIntent, mapIntentToAgent } from './intent-router'
import { runAgent } from './agent-runner'
import { enqueue, getFirst as getReplyQueueFirst, removeByChatId } from '../stores/reply-queue'
import { pushReplyToInjector } from '../browser'
import { handlePaymentEvent } from './payment-handler'
import { consola } from 'consola'

const logger = consola.withTag('agent')

/**
 * 处理用户新消息的入口函数
 *
 * 编排流程：
 * 1. 消息过滤与有效性校验（只处理用户发送的文本消息）
 * 2. 构建/更新会话记录（createOrUpdate）
 * 3. 追加用户消息到会话历史
 * 4. 意图分类（LLM）
 * 5. 映射到对应 Agent
 * 6. 执行 Agent 生成回复
 * 7. 记录 AI 回复到会话
 * 8. 存入待发队列（供注入层轮询获取并渲染到页面）
 */
export async function handleNewUserMessage(data: Conversation): Promise<void> {
  const { chatInfo, messages } = data

  // 容错 if messages is empty
  if (!messages.length) return

  // ── 1. 构建/更新会话记录 ────────────────────────────────
  createOrUpdate(data)

  // ── 2. 检测人工接管 ────────────────────────────────
  // 如果用户发送的消息等于 humanTakeoverKeywords，表示人工已接管，跳过 AI 处理
  const config = getAppConfig()
  const humanTakeoverKeywords = config.humanTakeoverKeywords?.trim()
  if (humanTakeoverKeywords) {
    const lastMsg = messages[messages.length - 1]
    if (
      lastMsg.isSelf &&
      lastMsg.type === 'text' &&
      lastMsg.content?.trim() === humanTakeoverKeywords
    ) {
      logger.info(`[人工接管] 检测到关键词 "${humanTakeoverKeywords}"，跳过 AI 处理`)
      return
    }
  }

  // ── 3. 最后一个消息由用户发起的文本消息，其他的都忽略 ────────────────────────────────
  // 只保留用户发送的文本消息（type=text, 非 self, 有内容）
  const lastMsg = messages[messages.length - 1]
  const allow = lastMsg.type === 'text' && !lastMsg.isSelf && lastMsg.content?.trim()

  // 支付事件拦截（支付卡片 type='card' + paymentInfo，不满足 allow 条件）
  if (lastMsg.type === 'card' && lastMsg.paymentInfo) {
    await handlePaymentEvent(chatInfo, lastMsg.paymentInfo)
    return
  }

  if (!allow) return

  // ── 3. 获取 商品信息 ────────────────────────────────
  const product = getProductInfoById(chatInfo.itemId)
  if (!product) {
    logger.error(`商品 ${chatInfo.itemId} 不存在`)
    return
  }

  logger.info(
    `[收到消息] 用户: ${chatInfo.userName}, 商品: ${product.title}, 消息: ${lastMsg.content?.slice(0, 50)}`
  )

  // ── 4. 意图分类 ────────────────────────────────
  const intent = await classifyIntent(lastMsg.content ?? '')
  logger.info(`[意图分类] ${intent}`)

  // ── 5. 映射到 Agent ────────────────────────────────
  const agentName = mapIntentToAgent(intent)
  logger.info(`[Agent] 使用 ${agentName} 处理`)

  // ── 6. 执行 Agent 生成回复 ────────────────────────────────
  let replyText: string
  try {
    const result = await runAgent(agentName as AgentKey, product, messages)
    replyText = result

    // 构建会话 ID
    const chatId = buildChatId(chatInfo.userName, chatInfo.itemId)

    // ── 7. 记录 AI 回复到会话 ────────────────────────────────
    appendMessage(chatId, replyText)
    // ── 8. 尝试主动推送回复到注入脚本 ────────────────────────────────
    const pushed = await pushReplyToInjector(chatId, replyText)
    if (pushed) {
      // 推送成功，清除该 chatId 残留的队列条目（防止重复发送）
      removeByChatId(chatId)
    } else {
      // 推送失败（注入脚本忙或窗口不存在），回退到队列
      enqueue(chatId, replyText)
    }
    logger.info(`[回复成功] ${replyText.slice(0, 50)}...`)
  } catch (err) {
    logger.error(`[回复失败] ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * 获取待发回复（供 injected 层轮询调用）
 *
 * 流程：
 * 1. 从 replyQueue 获取第一个 chatId
 * 2. 从 conversationStore 获取对话数据
 * 3. 提取最后一条消息作为 replyText
 * 4. 返回 { chatInfo, replyText }
 */
export function getReply(): { chatInfo: ChatInfo; replyText: string } | null {
  const item = getReplyQueueFirst()
  if (!item) {
    return null
  }

  const packet = getConversationById(item.chatId)
  if (!packet) {
    logger.warn(`[getReply] 对话不存在: ${item.chatId}`)
    return null
  }

  return {
    chatInfo: packet.chatInfo,
    replyText: item.replyText
  }
}
