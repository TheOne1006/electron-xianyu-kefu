import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AgentContextValue {
  agentRunning: boolean
  agentStatus: string
  processedCount: number
  toggleAgent: () => Promise<void>
  toggling: boolean
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [agentStatus, setAgentStatus] = useState('未启动')
  // agent:toggle IPC 已废弃，以下状态暂时保留 stub 实现
  const agentRunning = false
  const processedCount = 0
  const toggling = false

  // agent:toggle IPC 已废弃，agent 状态由注入脚本自行管理
  useEffect(() => {
    // no-op: agent 状态不再通过 IPC 同步
  }, [])

  const toggleAgent = useCallback(async () => {
    // stub: agent:toggle 已废弃
    setAgentStatus('功能已移除')
  }, [])

  return (
    <AgentContext.Provider
      value={{ agentRunning, agentStatus, processedCount, toggleAgent, toggling }}
    >
      {children}
    </AgentContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgent must be used within AgentProvider')
  return ctx
}
