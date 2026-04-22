import { ipcMain } from 'electron'

import {
  getAgentConfig,
  getAllAgentConfigs,
  saveAgentConfig,
  upsertAgentConfig
} from '../stores/agent-config-store'
import { ok } from '../ipc-response'
import type { AgentConfig, AgentKey } from '../../shared/types'

export function registerAgentConfigHandlers(): void {
  ipcMain.handle('agent-config:all', () => {
    return ok(getAllAgentConfigs())
  })

  ipcMain.handle('agent-config:getById', (_event, { key }: { key: AgentKey }) => {
    return ok(getAgentConfig(key))
  })

  ipcMain.handle(
    'agent-config:update',
    (_event, { key, config }: { key: AgentKey; config: AgentConfig }) => {
      saveAgentConfig(key, config)
      return ok(null)
    }
  )

  ipcMain.handle(
    'agent-config:upsert',
    (_event, { key, config }: { key: AgentKey; config: AgentConfig }) => {
      upsertAgentConfig(key, config)
      return ok(null)
    }
  )
}
