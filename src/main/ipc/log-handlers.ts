import { ipcMain } from 'electron'
import { safeHandle } from './safe-handle'
import { ok } from '../ipc-response'
import { logCollector } from '../log'
import type { LogEntry } from '../../shared/types'

export function registerLogHandlers(): void {
  safeHandle('log:request', () => {
    return ok(logCollector.getHistory())
  })

  safeHandle('log:clear', () => {
    logCollector.clear()
    return ok(null)
  })

  // log:push 使用 ipcMain.on 而非 safeHandle（ipcMain.handle）
  // 因为发送端使用 ipcRenderer.send，两者必须匹配
  ipcMain.on('log:push', (_event, entry: LogEntry) => {
    logCollector.pushFromOtherProcess(entry)
  })

  safeHandle('log:history', (_event, date: string) => {
    return ok(logCollector.getHistoryFromFile(date))
  })

  safeHandle('log:listDates', () => {
    return ok(logCollector.listLogDates())
  })
}
