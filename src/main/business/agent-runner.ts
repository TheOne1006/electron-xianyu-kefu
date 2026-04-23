import OpenAI from 'openai'
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { getAppConfig } from '../stores/app-config-store'
import { getAgentConfig } from '../stores/agent-config-store'
import type { AgentConfig } from '../../shared/types'
import { filterSafety } from './safety-filter'
import { filterThinkingTags } from './filter-thinking-tags'
import type { AgentKey, ChatMessage, Product } from '../../shared/types'
import { getDocumentsByKeys } from '../stores/document-store'
import { consola } from 'consola'

const logger = consola.withTag('agent-runner')

const LLM_TIMEOUT_MS = 30_000

/**
 * 调用 LLM 生成回复
 *
 * @param messages - 消息列表
 * @param agentConfig - Agent 配置（temperature、maxTokens）
 * @returns 返回官方 ChatCompletion 类型
 * @throws API Key 未配置、请求失败或超时时抛错
 */
async function createCompletion(
  messages: ChatCompletionMessageParam[],
  agentConfig: AgentConfig
): Promise<ChatCompletion> {
  const appConfig = getAppConfig()

  if (!appConfig.apiKey) {
    throw new Error('[LLMClient] API Key 未配置，请在设置中填写 API Key')
  }

  const client = new OpenAI({
    apiKey: appConfig.apiKey,
    baseURL: appConfig.baseURL
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

  try {
    const completion = await client.chat.completions.create(
      {
        model: appConfig.model,
        messages,
        temperature: agentConfig.temperature,
        max_tokens: agentConfig.maxTokens
      },
      { signal: controller.signal }
    )

    return completion
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`[LLMClient] 请求超时（${LLM_TIMEOUT_MS / 1000}秒）`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 构建 system prompt
 * - 基础 prompt 文本
 * - 商品信息（名称、价格、描述）
 */
function buildSystemPrompt(agentKey: AgentKey, product: Product): string {
  const config = getAgentConfig(agentKey)
  const prompt = config.prompt

  // system message: prompt + 商品信息
  const productInfos: string[] = [
    `商品名称: ${product.title}`,
    product.priceStrategy ? `商品价格: ${product.priceStrategy}` : '',
    product.content ? `商品描述: ${product.content}` : ''
  ]

  // 注入关联文档
  if (product.documentKeys?.length) {
    const docs = getDocumentsByKeys(product.documentKeys)
    const docLines = Object.entries(docs).map(([title, content]) => `${title}: ${content}`)
    if (docLines.length > 0) {
      productInfos.push(...docLines)
    }
  }

  return `${prompt}\n\n【商品信息】\n${productInfos.filter(Boolean).join('\n')}`
}

/**
 * 将 ChatMessage[] (DOM 层) 转换为 LLMChatMessage[] (API 层)
 * - system message: prompt + 商品信息（由 buildSystemPrompt 构建）
 * - history: 双方消息交错排列
 * - user message: 最后一条非自己的消息 content
 *
 * 角色映射规则：
 * - isSelf=true（自己/卖家客服）→ assistant（AI/助手角色）
 * - isSelf=false（对方/买家）→ user（用户角色）
 *
 * 这是因为 AI 扮演的是"客服助手"，而 LLM API 中 assistant 角色代表"AI/助手"
 * 业务上：assistant = 客服（回复方），user = 客户（提问方）
 */
function buildMessages(
  agentKey: AgentKey,
  product: Product,
  messages: ChatMessage[]
): ChatCompletionMessageParam[] {
  const systemContent = buildSystemPrompt(agentKey, product)

  // 对话历史：双方消息交错排列
  // isSelf=true 表示自己(卖家客服)，isSelf=false 表示对方(买家)
  // 映射到 OpenAI 角色：自己 → assistant，对方 → user
  // AI 扮演"客服助手"，LLM API 中 assistant 角色代表"AI/助手"
  // 业务上：assistant = 客服（回复方），user = 客户（提问方）
  const historyMessages: ChatCompletionMessageParam[] = messages.map((msg: ChatMessage) => ({
    role: msg.isSelf ? ('assistant' as const) : ('user' as const),
    content: msg.content ?? ''
  }))

  return [{ role: 'system', content: systemContent }, ...historyMessages]
}

/**
 * 运行 Agent 生成回复
 * @param agentKey Agent 类型键名
 * @param product 商品信息
 * @param messages 对话历史消息
 * @returns 安全过滤后的回复内容
 */
export async function runAgent(
  agentKey: AgentKey,
  product: Product,
  messages: ChatMessage[]
): Promise<string> {
  const config = getAgentConfig(agentKey)
  const llmMessages = buildMessages(agentKey, product, messages)

  logger.debug(`[AgentRunner] 构建消息完成，共 ${llmMessages.length} 条`)
  logger.info(
    `[AgentRunner] 开始调用 LLM, temperature: ${config.temperature}, maxTokens: ${config.maxTokens}`
  )

  const result = await createCompletion(llmMessages, config)

  const content = result.choices[0]?.message?.content
  if (!content) {
    throw new Error('[LLMClient] API 返回内容为空')
  }

  // 过滤敏感内容
  const safeContent = filterSafety(content)
  // 过滤思考标签
  const filteredContent = filterThinkingTags(safeContent)
  // 移除首尾空格
  const trimmedContent = filteredContent.trim()

  if (result.usage) {
    logger.info(`[AgentRunner] LLM 调用完成, token 使用: ${JSON.stringify(result.usage)}`)
  }

  return trimmedContent
}
