import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import type { AgentKey, AgentConfig } from '@shared/types'
import systemDefault from '@shared/defaults/prompts/system.json'
import classifyDefault from '@shared/defaults/prompts/classify.json'
import defaultAgentDefault from '@shared/defaults/prompts/default.json'
import priceDefault from '@shared/defaults/prompts/price.json'
import techDefault from '@shared/defaults/prompts/tech.json'

const AGENTS: { key: AgentKey; label: string; description: string }[] = [
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

const DEFAULT_PROMPTS: Record<
  AgentKey,
  { temperature: number; maxTokens: number; prompt: string }
> = {
  system: systemDefault,
  classify: classifyDefault,
  default: defaultAgentDefault,
  price: priceDefault,
  tech: techDefault
}

interface AgentCardData {
  prompt: string
  temperature: number
  maxTokens: number
}

export function AgentConfigPage(): React.JSX.Element {
  const [configs, setConfigs] = useState<Record<AgentKey, AgentCardData>>({
    system: { prompt: '', temperature: 0.7, maxTokens: 2048 },
    classify: { prompt: '', temperature: 0.1, maxTokens: 50 },
    default: { prompt: '', temperature: 0.7, maxTokens: 1024 },
    price: { prompt: '', temperature: 0.7, maxTokens: 1024 },
    tech: { prompt: '', temperature: 0.7, maxTokens: 1024 }
  })
  const [dirtyKeys, setDirtyKeys] = useState<Set<AgentKey>>(new Set())
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  // 加载所有 Agent 配置
  useEffect(() => {
    window.electron.agentConfig.all().then((allConfigs: Record<AgentKey, AgentConfig>) => {
      setConfigs({
        system: { ...allConfigs.system },
        classify: { ...allConfigs.classify },
        default: { ...allConfigs.default },
        price: { ...allConfigs.price },
        tech: { ...allConfigs.tech }
      })
      setLoading(false)
    })
  }, [])

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

  const handleSave = useCallback(
    async (key: AgentKey) => {
      const config = configs[key]
      if (!config) return

      try {
        await window.electron.agentConfig.upsert(key, {
          prompt: config.prompt,
          temperature: config.temperature,
          maxTokens: config.maxTokens
        })
        setDirtyKeys((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        showToast('success', `${AGENTS.find((a) => a.key === key)?.label} 保存成功`)
      } catch (error) {
        showToast('error', `保存失败: ${error}`)
      }
    },
    [configs, showToast]
  )

  const handleReset = useCallback((key: AgentKey) => {
    const defaults = DEFAULT_PROMPTS[key]

    setConfigs((prev) => ({
      ...prev,
      [key]: {
        prompt: defaults.prompt,
        temperature: defaults.temperature,
        maxTokens: defaults.maxTokens
      }
    }))
    setDirtyKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-secondary)'
        }}
      >
        加载中...
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-4)',
        gap: 'var(--space-4)',
        overflowY: 'auto'
      }}
    >
      {AGENTS.map((agent) => {
        const config = configs[agent.key]
        if (!config) return null
        const isDirty = dirtyKeys.has(agent.key)

        return (
          <div
            key={agent.key}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)'
            }}
          >
            {/* Agent 头部 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{agent.label}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {agent.description}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button onClick={() => handleReset(agent.key)} className="btn btn-secondary btn-sm">
                  重置
                </button>
                <button
                  onClick={() => handleSave(agent.key)}
                  disabled={!isDirty}
                  className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {isDirty ? '保存' : '已保存'}
                </button>
              </div>
            </div>

            {/* 参数行 */}
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    marginBottom: 'var(--space-1)'
                  }}
                >
                  Temperature
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.temperature}
                  onChange={(e) =>
                    handleFieldChange(agent.key, 'temperature', parseFloat(e.target.value) || 0)
                  }
                  className="input-field"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    marginBottom: 'var(--space-1)'
                  }}
                >
                  Max Tokens
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={config.maxTokens}
                  onChange={(e) =>
                    handleFieldChange(agent.key, 'maxTokens', parseInt(e.target.value, 10) || 0)
                  }
                  className="input-field"
                />
              </div>
            </div>

            {/* Prompt 编辑区 */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  marginBottom: 'var(--space-1)'
                }}
              >
                Prompt
              </label>
              <textarea
                value={config.prompt}
                onChange={(e) => handleFieldChange(agent.key, 'prompt', e.target.value)}
                rows={8}
                className="textarea-field"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
