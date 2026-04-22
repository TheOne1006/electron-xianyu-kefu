import { ipcMain } from 'electron'

import { createXYBrowserWindow, closeXYBrowserWindow, isXYBrowserRunning } from '../browser'
import { getAppConfig, saveAppConfig } from '../stores/app-config-store'
import type { AppConfig } from '../../shared/types'
import { ok } from '../ipc-response'

export function registerCoreHandlers(): void {
  ipcMain.handle('ping', () => {
    return ok('pong')
  })

  ipcMain.handle('config:get', () => {
    return ok(getAppConfig())
  })

  ipcMain.handle('config:save', (_event, config: Partial<AppConfig>) => {
    saveAppConfig(config)
    return ok(null)
  })

  ipcMain.handle('xy-browser:launch', (_event, config: AppConfig) => {
    createXYBrowserWindow(config)
    return ok(null)
  })

  ipcMain.handle('xy-browser:close', () => {
    closeXYBrowserWindow()
    return ok(null)
  })

  ipcMain.handle('xy-browser:getStatus', () => {
    return ok(isXYBrowserRunning())
  })
}
