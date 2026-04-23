import type { AgentKey } from '@shared/types'
import type { AgentCardData, AgentDefinition } from '../../hooks/useAgentConfigs'

interface AgentConfigCardProps {
  agent: AgentDefinition
  config: AgentCardData
  isDirty: boolean
  onFieldChange: (key: AgentKey, field: keyof AgentCardData, value: string | number) => void
  onSave: (key: AgentKey) => void
  onReset: (key: AgentKey) => void
}

/**
 * 渲染单个 Agent 的配置卡片。
 */
export function AgentConfigCard({
  agent,
  config,
  isDirty,
  onFieldChange,
  onSave,
  onReset
}: AgentConfigCardProps): React.JSX.Element {
  return (
    <section className="card agent-config-page__card">
      <div className="agent-config-page__header">
        <div className="agent-config-page__meta">
          <div className="h2">{agent.label}</div>
          <div className="agent-config-page__description">{agent.description}</div>
        </div>
        <div className="agent-config-page__actions">
          <button className="btn btn-secondary btn-sm" onClick={() => onReset(agent.key)}>
            重置
          </button>
          <button
            className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-secondary'}`}
            disabled={!isDirty}
            onClick={() => onSave(agent.key)}
          >
            {isDirty ? '保存' : '已保存'}
          </button>
        </div>
      </div>

      <div className="agent-config-page__fields">
        <div className="form-group">
          <label className="form-label">Temperature</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={config.temperature}
            onChange={(event) =>
              onFieldChange(agent.key, 'temperature', parseFloat(event.target.value) || 0)
            }
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Max Tokens</label>
          <input
            type="number"
            min={1}
            step={1}
            value={config.maxTokens}
            onChange={(event) =>
              onFieldChange(agent.key, 'maxTokens', parseInt(event.target.value, 10) || 0)
            }
            className="input-field"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Prompt</label>
        <textarea
          value={config.prompt}
          onChange={(event) => onFieldChange(agent.key, 'prompt', event.target.value)}
          rows={8}
          className="textarea-field"
        />
      </div>
    </section>
  )
}
