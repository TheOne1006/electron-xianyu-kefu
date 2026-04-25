import Store from 'electron-store'
import type { AgentKey, AgentConfig } from '../../shared/types'

import systemPrompt from '@shared/defaults/prompts/system.json'
import classifyPrompt from '@shared/defaults/prompts/classify.json'
import defaultPrompt from '@shared/defaults/prompts/default.json'
import pricePrompt from '@shared/defaults/prompts/price.json'
import techPrompt from '@shared/defaults/prompts/tech.json'

// ============================================================
// 默认配置
// ============================================================

/**
 * 从 @shared/defaults/prompts 加载所有 Agent 的默认配置
 *
 * @returns 以 AgentKey 为键的默认配置映射
 */
function loadDefaultAgents(): Record<AgentKey, AgentConfig> {
  return {
    system: systemPrompt as AgentConfig,
    classify: classifyPrompt as AgentConfig,
    default: defaultPrompt as AgentConfig,
    price: pricePrompt as AgentConfig,
    tech: techPrompt as AgentConfig
  }
}

const defaultAgents = loadDefaultAgents()

// ============================================================
// Store 实例
// ============================================================

const StoreClass = (Store as unknown as { default: typeof Store }).default || Store

export const agentConfigStore = new StoreClass<Record<AgentKey, AgentConfig>>({
  name: 'agent-config',
  defaults: defaultAgents
})

// ============================================================
// Agent 配置操作
// ============================================================

/**
 * 获取指定 Agent 的配置
 *
 * @param key - Agent 标识（system / classify / default / price / tech）
 * @returns 该 Agent 的完整配置
 */
export function getAgentConfig(key: AgentKey): AgentConfig {
  return agentConfigStore.get(key)
}

/**
 * 获取所有 Agent 的配置
 *
 * @returns 以 AgentKey 为键的完整配置映射
 */
export function getAllAgentConfigs(): Record<AgentKey, AgentConfig> {
  return agentConfigStore.store as Record<AgentKey, AgentConfig>
}

/**
 * 保存指定 Agent 的配置（整体替换）
 *
 * @param key - Agent 标识
 * @param config - 新的完整 Agent 配置
 */
export function saveAgentConfig(key: AgentKey, config: AgentConfig): void {
  agentConfigStore.set(key, config)
}

/**
 * 插入或更新 Agent 配置（全量替换，存在则覆盖，不存在则创建）
 *
 * @param key - Agent 标识
 * @param config - 新的完整 Agent 配置
 */
export function upsertAgentConfig(key: AgentKey, config: AgentConfig): void {
  agentConfigStore.set(key, config)
}

/**
 * 全量替换所有 Agent 配置（用于导入）
 */
export function replaceAll(configs: Record<AgentKey, AgentConfig>): void {
  for (const [key, config] of Object.entries(configs)) {
    agentConfigStore.set(key, config)
  }
}
