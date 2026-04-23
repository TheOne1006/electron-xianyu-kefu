import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { consola } from 'consola'
import { err } from '../ipc-response'

const logger = consola.withTag('ipc:safe-handle')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IpcHandler = (event: IpcMainInvokeEvent, ...args: any[]) => any

/**
 * 安全的 IPC handler 注册函数，自动包装 try-catch
 * - 正常路径：直接返回 handler 结果
 * - 异常路径：捕获错误、记录日志、返回 err()，防止 Promise 挂起
 */
export function safeHandle(channel: string, handler: IpcHandler): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args)
    } catch (error) {
      logger.error(`[${channel}] 未捕获异常:`, error)
      return err(9999, `服务端错误: ${error instanceof Error ? error.message : String(error)}`)
    }
  })
}
