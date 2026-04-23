import { createXYBrowserWindow, closeXYBrowserWindow, isXYBrowserRunning } from '../browser'
import { getAppConfig, saveAppConfig } from '../stores/app-config-store'
import type { AppConfig } from '../../shared/types'
import { ok } from '../ipc-response'
import { safeHandle } from './safe-handle'

export function registerCoreHandlers(): void {
  safeHandle('ping', () => {
    return ok('pong')
  })

  safeHandle('config:get', () => {
    return ok(getAppConfig())
  })

  safeHandle('config:save', (_event, config: Partial<AppConfig>) => {
    saveAppConfig(config)
    return ok(null)
  })

  safeHandle('xy-browser:launch', (_event, config: AppConfig) => {
    createXYBrowserWindow(config)
    return ok(null)
  })

  safeHandle('xy-browser:close', () => {
    closeXYBrowserWindow()
    return ok(null)
  })

  safeHandle('xy-browser:getStatus', () => {
    return ok(isXYBrowserRunning())
  })
}
