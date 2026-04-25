import { consola } from 'consola'
import {
  getAgentConfig,
  getAllAgentConfigs,
  saveAgentConfig,
  upsertAgentConfig
} from '../stores/agent-config-store'
import { ok } from '../ipc-response'
import type { AgentConfig, AgentKey } from '../../shared/types'
import { safeHandle } from './safe-handle'

const logger = consola.withTag('ipc:agent-config')

export function registerAgentConfigHandlers(): void {
  safeHandle('agent-config:all', () => {
    return ok(getAllAgentConfigs())
  })

  safeHandle('agent-config:getById', (_event, { key }: { key: AgentKey }) => {
    return ok(getAgentConfig(key))
  })

  safeHandle(
    'agent-config:update',
    (_event, { key, config }: { key: AgentKey; config: AgentConfig }) => {
      saveAgentConfig(key, config)
      logger.info(`[update] Agent 配置已更新: ${key}`)
      return ok(null)
    }
  )

  safeHandle(
    'agent-config:upsert',
    (_event, { key, config }: { key: AgentKey; config: AgentConfig }) => {
      upsertAgentConfig(key, config)
      logger.info(`[upsert] Agent 配置已保存: ${key}`)
      return ok(null)
    }
  )
}
