import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { LogEntry } from '@shared/types'

const MAX_LOGS = 1000

export function useLogsPage(): {
  logs: LogEntry[]
  levelFilter: Set<string>
  tagFilter: string
  availableTags: string[]
  listRef: React.RefObject<HTMLDivElement | null>
  toggleLevel: (level: string) => void
  setTagFilter: (filter: string) => void
  clearLogs: () => Promise<void>
  handleScroll: () => void
  loadHistory: (date: string) => Promise<void>
  historyDates: string[]
} {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [levelFilter, setLevelFilter] = useState<Set<string>>(
    new Set(['debug', 'info', 'warn', 'error', 'fatal'])
  )
  const [tagFilter, setTagFilter] = useState<string>('')
  const listRef = useRef<HTMLDivElement>(null)
  const isAutoScrollRef = useRef(true)

  const addEntry = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [...prev, entry]
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next
    })
  }, [])

  const clearLogs = useCallback(async () => {
    await window.electron.log.clear()
    setLogs([])
  }, [])

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

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!levelFilter.has(log.level)) return false
      if (tagFilter && log.tag !== tagFilter) return false
      return true
    })
  }, [logs, levelFilter, tagFilter])

  const availableTags = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.tag))).sort()
  }, [logs])

  const scrollToBottom = useCallback(() => {
    if (listRef.current && isAutoScrollRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (listRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current
      isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50
    }
  }, [])

  const [historyDates, setHistoryDates] = useState<string[]>([])

  const loadHistory = useCallback(async (date: string) => {
    const lines = await window.electron.log.history(date)
    const entries: LogEntry[] = lines.map((line, i) => {
      const match = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*\[(\w+)\s*\]\s*\[(.+?)\]\s*(.*)$/)
      if (!match) {
        return {
          id: `hist-${date}-${i}`,
          level: 'info' as const,
          tag: 'file',
          message: line,
          timestamp: 0
        }
      }
      const [, time, level, tag, message] = match
      const today = new Date().toISOString().slice(0, 10)
      const d = new Date(`${today}T${time}`)
      return {
        id: `hist-${date}-${i}`,
        level: level.toLowerCase() as LogEntry['level'],
        tag,
        message,
        timestamp: d.getTime() || Date.now()
      }
    })
    setLogs((prev) => [...entries, ...prev])
  }, [])

  useEffect(() => {
    window.electron.log.listDates().then(setHistoryDates)
  }, [])

  useEffect(() => {
    const cleanup = window.electron.log.onNew(addEntry)
    window.electron.log.request().then(setLogs)
    return cleanup
  }, [addEntry])

  useEffect(() => {
    scrollToBottom()
  }, [filteredLogs, scrollToBottom])

  return {
    logs: filteredLogs,
    levelFilter,
    tagFilter,
    availableTags,
    listRef,
    toggleLevel,
    setTagFilter,
    clearLogs,
    handleScroll,
    loadHistory,
    historyDates
  }
}
