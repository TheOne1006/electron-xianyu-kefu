import type { Conversation } from '@shared/types'

interface SessionListProps {
  sessions: Conversation[]
  selectedId: string | null
  onSelect: (chatId: string) => void
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  onDelete?: (chatId: string) => void
}

export function SessionList({
  sessions,
  selectedId,
  onSelect,
  isLoading = false,
  error = null,
  onRetry,
  onDelete
}: SessionListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)'
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '60px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: 'var(--space-4)',
          textAlign: 'center'
        }}
      >
        <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
          {error}
        </div>
        {onRetry && (
          <button className="btn btn-primary btn-sm" onClick={onRetry}>
            重试
          </button>
        )}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-4)',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ margin: '0 auto var(--space-3)', opacity: 0.5 }}
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <div>暂无聊天记录</div>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {sessions.map((session) => {
        const chatId = `${session.chatInfo.userName}_${session.chatInfo.itemId}`
        const lastMsg =
          session.messages.length > 0 ? session.messages[session.messages.length - 1] : null

        return (
          <div
            key={chatId}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
              backgroundColor: selectedId === chatId ? 'var(--bg-elevated)' : 'transparent',
              borderLeft:
                selectedId === chatId ? '3px solid var(--brand-primary)' : '3px solid transparent',
              borderBottom: '1px solid var(--border-default)',
              transition: 'all var(--duration-fast) var(--ease-default)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement
              if (deleteBtn) deleteBtn.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement
              if (deleteBtn) deleteBtn.style.opacity = '0'
            }}
          >
            <button
              onClick={() => onSelect(chatId)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                padding: 0
              }}
            >
              {/* 头像占位 */}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)'
                }}
              >
                {session.chatInfo.userName.charAt(0).toUpperCase()}
              </div>

              {/* 内容 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 'var(--space-1)'
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}
                  >
                    {session.chatInfo.userName}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {session.messages.length} 条
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-1)'
                  }}
                >
                  商品: {session.chatInfo.itemId}
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {lastMsg?.content || '暂无消息'}
                </div>
              </div>
            </button>

            {/* 删除按钮 */}
            {onDelete && (
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(chatId)
                }}
                style={{
                  position: 'absolute',
                  top: 'var(--space-2)',
                  right: 'var(--space-2)',
                  padding: 'var(--space-1) var(--space-2)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  opacity: 0,
                  transition: 'opacity var(--duration-fast)',
                  zIndex: 1
                }}
              >
                删除
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
