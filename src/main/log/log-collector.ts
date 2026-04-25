import type { BrowserWindow } from 'electron'
import type { LogEntry, LogLevel } from '../../shared/types'
import { logFileWriter } from './file-writer'

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
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level: typeToLevel[logObj.type ?? 'info'] ?? 'info',
      tag: logObj.tag || 'default',
      message: logObj.args?.map((arg) => String(arg)).join(' ') || '',
      args: logObj.args,
      timestamp: logObj.date?.getTime() ?? Date.now()
    }

    // 写入文件
    logFileWriter.write(entry)

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

  /**
   * 从其他进程接收日志条目并写入文件
   */
  pushFromOtherProcess(entry: LogEntry): void {
    logFileWriter.write(entry)

    this.buffer.push(entry)
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift()
    }

    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('log:new', entry)
    }
  }

  /**
   * 从文件读取指定日期的日志
   */
  getHistoryFromFile(date: string): string[] {
    return logFileWriter.readLog(date)
  }

  /**
   * 列出所有可用的日志日期
   */
  listLogDates(): string[] {
    return logFileWriter.listDates()
  }
}

/** 单例实例 */
export const logCollector = new LogCollector()
