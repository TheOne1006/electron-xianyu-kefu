import { useCallback, useEffect, useState } from 'react'
import type { AgentConfig, AgentKey } from '@shared/types'
import systemDefault from '@shared/defaults/prompts/system.json'
import classifyDefault from '@shared/defaults/prompts/classify.json'
import defaultAgentDefault from '@shared/defaults/prompts/default.json'
import priceDefault from '@shared/defaults/prompts/price.json'
import techDefault from '@shared/defaults/prompts/tech.json'
import { useToast } from '../contexts/ToastContext'

/** Agent 卡片视图所需的数据结构。 */
export interface AgentCardData {
  prompt: string
  temperature: number
  maxTokens: number
}

/** Agent 元信息。 */
export interface AgentDefinition {
  key: AgentKey
  label: string
  description: string
}

/** Agent 配置元数据。 */
export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    key: 'system',
    label: 'System',
    description: '系统级指令，全局约束和角色定义'
  },
  {
    key: 'classify',
    label: 'Classify',
    description: '意图分类，分类用户消息意图（temperature 极低）'
  },
  {
    key: 'default',
    label: 'Default',
    description: '通用回复，兜底 Agent'
  },
  {
    key: 'price',
    label: 'Price',
    description: '价格/砍价，用户询问价格、议价场景'
  },
  {
    key: 'tech',
    label: 'Tech',
    description: '技术问题，商品相关技术问题咨询'
  }
]

/** Agent 默认配置。 */
export const DEFAULT_AGENT_CONFIGS: Record<AgentKey, AgentCardData> = {
  system: systemDefault,
  classify: classifyDefault,
  default: defaultAgentDefault,
  price: priceDefault,
  tech: techDefault
}

interface UseAgentConfigsResult {
  configs: Record<AgentKey, AgentCardData>
  dirtyKeys: Set<AgentKey>
  loading: boolean
  agentDefinitions: AgentDefinition[]
  handleFieldChange: (key: AgentKey, field: keyof AgentCardData, value: string | number) => void
  handleSave: (key: AgentKey) => Promise<void>
  handleReset: (key: AgentKey) => void
}

/**
 * 将后端返回的 Agent 配置与本地默认值合并，确保 5 个 Agent 都有可用配置。
 */
export function createAgentConfigs(
  configs?: Partial<Record<AgentKey, Partial<AgentConfig>>>
): Record<AgentKey, AgentCardData> {
  return {
    system: { ...DEFAULT_AGENT_CONFIGS.system, ...configs?.system },
    classify: { ...DEFAULT_AGENT_CONFIGS.classify, ...configs?.classify },
    default: { ...DEFAULT_AGENT_CONFIGS.default, ...configs?.default },
    price: { ...DEFAULT_AGENT_CONFIGS.price, ...configs?.price },
    tech: { ...DEFAULT_AGENT_CONFIGS.tech, ...configs?.tech }
  }
}

/**
 * 管理 Agent 配置页面的数据加载、脏状态和保存重置行为。
 */
export function useAgentConfigs(): UseAgentConfigsResult {
  const [configs, setConfigs] = useState<Record<AgentKey, AgentCardData>>(() =>
    createAgentConfigs()
  )
  const [dirtyKeys, setDirtyKeys] = useState<Set<AgentKey>>(new Set())
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    window.electron.agentConfig
      .all()
      .then((allConfigs) => {
        setConfigs(createAgentConfigs(allConfigs))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  /**
   * 更新单个 Agent 的表单字段并标记为已修改。
   */
  const handleFieldChange = useCallback(
    (key: AgentKey, field: keyof AgentCardData, value: string | number) => {
      setConfigs((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value }
      }))
      setDirtyKeys((prev) => new Set(prev).add(key))
    },
    []
  )

  /**
   * 保存指定 Agent 的配置并清除脏状态。
   */
  const handleSave = useCallback(
    async (key: AgentKey) => {
      const config = configs[key]
      if (!config) return

      try {
        await window.electron.agentConfig.upsert(key, config)
        setDirtyKeys((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        showToast(
          'success',
          `${AGENT_DEFINITIONS.find((definition) => definition.key === key)?.label} 保存成功`
        )
      } catch (error) {
        showToast('error', `保存失败: ${error}`)
      }
    },
    [configs, showToast]
  )

  /**
   * 将指定 Agent 重置为默认配置，并清理脏状态。
   */
  const handleReset = useCallback((key: AgentKey) => {
    setConfigs((prev) => ({
      ...prev,
      [key]: { ...DEFAULT_AGENT_CONFIGS[key] }
    }))
    setDirtyKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  return {
    configs,
    dirtyKeys,
    loading,
    agentDefinitions: AGENT_DEFINITIONS,
    handleFieldChange,
    handleSave,
    handleReset
  }
}
