import { mkdirSync, createWriteStream, readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { LogEntry } from '../../shared/types'

const LOG_DIR = join(homedir(), '.electron-xianyu-kefu', 'logs')

function formatLine(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  return `[${time}] [${entry.level.toUpperCase().padEnd(5)}] [${entry.tag}] ${entry.message}\n`
}

class LogFileWriter {
  private stream: ReturnType<typeof createWriteStream> | null = null
  private currentDate = ''

  write(entry: LogEntry): void {
    const today = new Date().toISOString().slice(0, 10)
    if (today !== this.currentDate) {
      this.rotate(today)
    }
    this.stream?.write(formatLine(entry))
  }

  private rotate(date: string): void {
    this.stream?.end()
    mkdirSync(LOG_DIR, { recursive: true })
    this.stream = createWriteStream(join(LOG_DIR, `app-${date}.log`), { flags: 'a' })
    this.currentDate = date
  }

  readLog(date: string): string[] {
    const filePath = join(LOG_DIR, `app-${date}.log`)
    if (!existsSync(filePath)) return []
    return readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter((line) => line.length > 0)
  }

  listDates(): string[] {
    if (!existsSync(LOG_DIR)) return []
    return readdirSync(LOG_DIR)
      .filter((f) => f.startsWith('app-') && f.endsWith('.log'))
      .map((f) => f.slice(4, 14))
      .sort()
      .reverse()
  }
}

/** 单例实例 */
export const logFileWriter = new LogFileWriter()
