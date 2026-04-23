import { AgentConfigCard } from '../components/agent-config/AgentConfigCard'
import { useAgentConfigs } from '../hooks/useAgentConfigs'
import './styles/agent-config-page.css'

/**
 * Agent 配置页面入口，负责装配配置卡片与加载态。
 */
export function AgentConfigPage(): React.JSX.Element {
  const {
    configs,
    dirtyKeys,
    loading,
    agentDefinitions,
    handleFieldChange,
    handleSave,
    handleReset
  } = useAgentConfigs()

  if (loading) {
    return <div className="center-state">加载中...</div>
  }

  return (
    <div className="agent-config-page">
      {agentDefinitions.map((agent) => {
        const config = configs[agent.key]
        if (!config) return null

        return (
          <AgentConfigCard
            key={agent.key}
            agent={agent}
            config={config}
            isDirty={dirtyKeys.has(agent.key)}
            onFieldChange={handleFieldChange}
            onSave={handleSave}
            onReset={handleReset}
          />
        )
      })}
    </div>
  )
}
