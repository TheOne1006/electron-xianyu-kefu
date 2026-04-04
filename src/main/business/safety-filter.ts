/**
 * 安全过滤器
 *
 * 从 appStore.config 中读取安全过滤配置（safetyFilterBlockedKeywords 和 safetyFilterReplacement），
 * 检测回复文本是否包含敏感词，命中则整体替换为安全提醒文本。
 */

import { appStore } from '../stores/app-config-store'

/**
 * 对回复文本做安全过滤
 *
 * 检测是否包含敏感词，命中则整体替换为安全提醒文本。
 * 配置从 appStore.config 读取。
 *
 * @param reply - 待过滤的回复文本
 * @returns 过滤后的文本（命中敏感词返回替换文本，否则原样返回）
 */
export function filterSafety(reply: string): string {
  const config = appStore.store
  const blockedKeywords = config.safetyFilterBlockedKeywords
  const replacement = config.safetyFilterReplacement

  if (!blockedKeywords || blockedKeywords.length === 0) {
    return reply
  }

  if (blockedKeywords.some((keyword) => reply.includes(keyword))) {
    return replacement
  }

  return reply
}
