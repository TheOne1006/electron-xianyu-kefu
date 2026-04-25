import { useLogsPage } from './logs-page-model'
import './styles/logs-page.css'

/**
 * 日志查看页面
 * 实时展示主进程的日志输出
 */
export function LogsPage(): React.JSX.Element {
  const {
    logs,
    levelFilter,
    tagFilter,
    availableTags,
    listRef,
    toggleLevel,
    setTagFilter,
    clearLogs,
    handleScroll
  } = useLogsPage()

  const levels = ['debug', 'info', 'warn', 'error', 'fatal'] as const

  /** 格式化时间戳为 HH:mm:ss */
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="page-shell">
      {/* 工具栏 */}
      <div className="logs-page__toolbar">
        <div className="logs-page__filters">
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-caption)' }}>
            级别:
          </span>
          <div className="logs-page__level-filters">
            {levels.map(level => (
              <button
                key={level}
                className={`logs-page__level-btn logs-page__level-btn--${level} ${
                  levelFilter.has(level) ? 'logs-page__level-btn--active' : ''
                }`}
                onClick={() => toggleLevel(level)}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>

          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-caption)', marginLeft: 'var(--space-2)' }}>
            模块:
          </span>
          <select
            className="logs-page__tag-select"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">全部</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <button className="logs-page__clear-btn" onClick={clearLogs}>
          清空
        </button>
      </div>

      {/* 日志列表 */}
      <div
        className="logs-page__list"
        ref={listRef}
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div className="logs-page__empty">暂无日志</div>
        ) : (
          logs.map(entry => (
            <div key={entry.id} className="logs-page__entry">
              <span className="logs-page__timestamp">{formatTime(entry.timestamp)}</span>
              <span className={`logs-page__level logs-page__level--${entry.level}`}>
                {entry.level.toUpperCase()}
              </span>
              <span className="logs-page__tag">[{entry.tag}]</span>
              <span className="logs-page__message">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
