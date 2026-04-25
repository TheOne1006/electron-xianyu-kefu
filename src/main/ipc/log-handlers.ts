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

  safeHandle('log:push', (_event, entry: LogEntry) => {
    logCollector.pushFromOtherProcess(entry)
    return ok(null)
  })

  safeHandle('log:history', (_event, date: string) => {
    return ok(logCollector.getHistoryFromFile(date))
  })

  safeHandle('log:listDates', () => {
    return ok(logCollector.listLogDates())
  })
}
