import type { ChatMessage, Product } from '../../shared/types'
import { runAgent } from './agent-runner'

type AgentInput = { messages: ChatMessage[]; product: Product }

// 关键词/正则预检规则
const TECH_KEYWORDS = ['参数', '规格', '型号', '连接', '对比', '能不能', '怎么']
const TECH_PATTERNS = [/和.+比/, /.+的区别/]

const PRICE_KEYWORDS = ['便宜', '价', '砍价', '少点', '能少', '优惠', '折扣', '减']
const PRICE_PATTERNS = [/\d+元/, /能少\d+/, /便宜\d+/]

/**
 * 检查文本是否包含任一关键词
 *
 * @param text - 待检查的文本
 * @param keywords - 关键词列表
 * @returns 是否匹配到任一关键词
 */
function matchKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw))
}

/**
 * 检查文本是否匹配任一正则模式
 *
 * @param text - 待检查的文本
 * @param patterns - 正则表达式列表
 * @returns 是否匹配到任一模式
 */
function matchPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text))
}

/**
 * 对用户消息进行意图分类
 *
 * 优先使用关键词/正则预检（技术类、价格类），
 * 若未命中则调用 LLM 进行兜底分类。
 *
 * @param userMessage - 用户发送的消息文本
 * @returns 意图标签（tech / price / bargain / inquiry / greeting / order / other）
 */
export async function classifyIntent(userMessage: string): Promise<string> {
  // 1. 技术类关键词/正则预检
  if (matchKeyword(userMessage, TECH_KEYWORDS) || matchPattern(userMessage, TECH_PATTERNS)) {
    return 'tech'
  }

  // 2. 价格类关键词/正则预检
  if (matchKeyword(userMessage, PRICE_KEYWORDS) || matchPattern(userMessage, PRICE_PATTERNS)) {
    return 'price'
  }

  // 3. LLM 兜底
  const input: AgentInput = {
    messages: [{ type: 'text', sender: 'user', isSelf: false, content: userMessage }],
    product: {
      id: '',
      title: '',
      images: [],
      mainImageUrl: '',
      documentKeys: []
    }
  }

  try {
    const result = await runAgent('classify', input.product, input.messages)
    const raw = result.trim().toLowerCase()
    const valid = ['bargain', 'inquiry', 'greeting', 'order', 'other']
    return valid.includes(raw) ? raw : 'other'
  } catch {
    return 'other'
  }
}

/**
 * 将意图标签映射到对应的 Agent key
 *
 * @param intent - 由 classifyIntent 返回的意图标签
 * @returns 对应的 Agent key（tech / price / default）
 */
export function mapIntentToAgent(intent: string): string {
  const map: Record<string, string> = {
    tech: 'tech',
    price: 'price',
    bargain: 'price',
    inquiry: 'default',
    greeting: 'default',
    order: 'default',
    other: 'default'
  }
  return map[intent] ?? 'default'
}
