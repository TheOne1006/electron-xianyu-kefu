import type { BrowserWindow } from 'electron'
import type { LogEntry, LogLevel } from '../../shared/types'

/**
 * 日志收集器
 *
 * 作为 consola 的自定义 reporter，收集主进程日志并推送到渲染进程。
 * 维护一个环形缓冲区（默认 1000 条），用于新打开日志页面时提供历史数据。
 */
class LogCollector {
  private win: BrowserWindow | null = null
  private buffer: LogEntry[] = []
  private readonly maxSize = 1000

  /**
   * 设置目标窗口引用
   * 在主窗口创建后调用
   */
  setWindow(win: BrowserWindow): void {
    this.win = win
  }

  /**
   * consola reporter 接口
   * consola 会在每次日志输出时调用此方法
   */
  report(logObj: {
    level?: number
    type?: string
    tag?: string
    args?: unknown[]
    date?: Date
  }): void {
    // 使用 logObj.type 而不是 logObj.level 来确定日志级别
    // consola 的 type 包括: 'fatal', 'error', 'warn', 'log', 'info', 'success', 'fail', 'ready', 'start', 'debug', 'trace'
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
      trace: 'debug' // trace 映射为 debug，因为 LogLevel 不包含 trace
    }

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level: typeToLevel[logObj.type ?? 'info'] ?? 'info',
      tag: logObj.tag || 'default',
      message: logObj.args?.map((arg) => String(arg)).join(' ') || '',
      args: logObj.args,
      timestamp: logObj.date?.getTime() || Date.now()
    }

    // 添加到缓冲区
    this.buffer.push(entry)
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift()
    }

    // 推送到渲染进程（如果窗口存在且未销毁）
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('log:new', entry)
    }
  }

  /**
   * 获取历史日志
   * 用于新打开日志页面时加载已有日志
   */
  getHistory(): LogEntry[] {
    return [...this.buffer]
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = []
  }
}

/** 单例实例 */
export const logCollector = new LogCollector()
