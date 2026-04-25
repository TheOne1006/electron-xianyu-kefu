import type { LogEntry, LogLevel } from './types'

const typeToLevel: Record<string, LogLevel> = {
  fatal: 'fatal',
  error: 'error',
  warn: 'warn',
  log: 'info',
  info: 'info',
  success: 'info',
  fail: 'error',
  ready: 'info',
  start: 'info',
  debug: 'debug',
  trace: 'debug'
}

export function createIpcLogReporter(sendFn: (channel: string, data: unknown) => void): {
  log: (logObj: { type?: string; tag?: string; args?: unknown[]; date?: Date }) => void
} {
  return {
    log: (logObj) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        level: typeToLevel[logObj.type ?? 'info'] ?? 'info',
        tag: logObj.tag || 'default',
        message: logObj.args?.map(String).join(' ') || '',
        timestamp: logObj.date?.getTime() ?? Date.now()
      }
      sendFn('log:push', entry)
    }
  }
}
