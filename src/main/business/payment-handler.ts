/**
 * 支付事件处理器
 *
 * 检测到支付卡片后：
 * 1. 自动发货：商品启用 autoDeliver 时，直接推送 autoDeliverContent
 * 2. Webhook 通知：商品未启用自动发货时，调用商家配置的 Webhook URL
 */

import { getById as getProductById } from '../stores/product-store'
import { getAppConfig } from '../stores/app-config-store'
import { buildChatId } from '../stores/conversation-store'
import { pushReplyToInjector } from '../browser'
import { enqueue } from '../stores/reply-queue'
import { consola } from 'consola'
import type { ChatInfo, PaymentInfo } from '../../shared/types'

const logger = consola.withTag('payment-handler')

/**
 * 处理支付事件
 *
 * @param chatInfo - 聊天会话信息（含买家 userName 和商品 itemId）
 * @param paymentInfo - 支付卡片信息（含标题和描述）
 */
export async function handlePaymentEvent(
  chatInfo: ChatInfo,
  paymentInfo: PaymentInfo
): Promise<void> {
  logger.info(`[支付事件] 检测到支付: ${paymentInfo.title}, 买家: ${chatInfo.userName}`)

  const product = getProductById(chatInfo.itemId)
  if (!product) {
    logger.warn(`[支付事件] 商品不存在: ${chatInfo.itemId}`)
    return
  }

  if (product.autoDeliver && product.autoDeliverContent) {
    const chatId = buildChatId(chatInfo.userName, chatInfo.itemId)
    logger.info(
      `[自动发货] 向 ${chatInfo.userName} 发送: ${product.autoDeliverContent.substring(0, 30)}...`
    )

    const pushed = await pushReplyToInjector(chatId, product.autoDeliverContent)
    if (pushed) {
      logger.info('[自动发货] 主动推送成功')
    } else {
      enqueue(chatId, product.autoDeliverContent)
      logger.info('[自动发货] 主动推送失败，已入队')
    }
  } else {
    const config = getAppConfig()
    if (config.orderWebhookUrl) {
      const url = config.orderWebhookUrl.replace('<title>', encodeURIComponent(product.title))
      logger.info(`[Webhook] 通知商家: ${url}`)
      try {
        await fetch(url)
      } catch (err) {
        logger.error(`[Webhook] 调用失败: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }
}
