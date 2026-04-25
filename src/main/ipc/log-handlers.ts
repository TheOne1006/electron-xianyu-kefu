import { safeHandle } from './safe-handle'
import { ok } from '../ipc-response'
import { logCollector } from '../log'

/**
 * 注册日志相关的 IPC handler
 */
export function registerLogHandlers(): void {
  // 获取历史日志
  safeHandle('log:request', () => {
    return ok(logCollector.getHistory())
  })

  // 清空日志
  safeHandle('log:clear', () => {
    logCollector.clear()
    return ok(null)
  })
}
