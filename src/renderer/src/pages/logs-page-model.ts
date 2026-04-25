import { useState, useEffect, useCallback, useRef } from 'react'
import type { LogEntry } from '@shared/types'

const MAX_LOGS = 1000

/**
 * 日志页面业务逻辑
 */
export function useLogsPage(): {
  logs: LogEntry[]
  allLogs: LogEntry[]
  levelFilter: Set<string>
  tagFilter: string
  availableTags: string[]
  listRef: React.RefObject<HTMLDivElement | null>
  toggleLevel: (level: string) => void
  setTagFilter: (filter: string) => void
  clearLogs: () => Promise<void>
  handleScroll: () => void
} {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [levelFilter, setLevelFilter] = useState<Set<string>>(
    new Set(['debug', 'info', 'warn', 'error', 'fatal'])
  )
  const [tagFilter, setTagFilter] = useState<string>('')
  const listRef = useRef<HTMLDivElement>(null)
  const isAutoScrollRef = useRef(true)

  // 添加日志条目
  const addEntry = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [...prev, entry]
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next
    })
  }, [])

  // 清空日志
  const clearLogs = useCallback(async () => {
    await window.electron.log.clear()
    setLogs([])
  }, [])

  // 切换级别过滤
  const toggleLevel = useCallback((level: string) => {
    setLevelFilter((prev) => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }, [])

  // 过滤后的日志
  const filteredLogs = logs.filter((log) => {
    if (!levelFilter.has(log.level)) return false
    if (tagFilter && log.tag !== tagFilter) return false
    return true
  })

  // 获取所有出现过的标签（用于过滤下拉）
  const availableTags = Array.from(new Set(logs.map((l) => l.tag))).sort()

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (listRef.current && isAutoScrollRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [])

  // 监听滚动事件，判断是否应该自动滚动
  const handleScroll = useCallback(() => {
    if (listRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current
      isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50
    }
  }, [])

  // 监听 IPC 日志事件
  useEffect(() => {
    const cleanup = window.electron.log.onNew(addEntry)
    window.electron.log.request().then(setLogs)
    return cleanup
  }, [addEntry])

  // 新日志到来时自动滚动
  useEffect(() => {
    scrollToBottom()
  }, [filteredLogs, scrollToBottom])

  return {
    logs: filteredLogs,
    allLogs: logs,
    levelFilter,
    tagFilter,
    availableTags,
    listRef,
    toggleLevel,
    setTagFilter,
    clearLogs,
    handleScroll
  }
}
