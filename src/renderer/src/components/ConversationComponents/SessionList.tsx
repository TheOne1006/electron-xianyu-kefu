import type { Conversation, Product } from '@shared/types'

interface SessionListProps {
  sessions: Conversation[]
  selectedId: string | null
  onSelect: (chatId: string) => void
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  onDelete?: (chatId: string) => void
  products: Map<string, Product>
}

export function SessionList({
  sessions,
  selectedId,
  onSelect,
  isLoading = false,
  error = null,
  onRetry,
  onDelete,
  products
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
              transition: 'background-color var(--duration-fast) var(--ease-default)',
              position: 'relative',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (selectedId !== chatId) {
                e.currentTarget.style.backgroundColor = 'var(--bg-surface)'
              }
              const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement
              if (deleteBtn) deleteBtn.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              if (selectedId !== chatId) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
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
                padding: 0,
                minWidth: 0
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
                {/* 用户名 + 消息条数（同一行） */}
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {session.chatInfo.userName}
                  <span
                    style={{
                      fontWeight: 400,
                      color: 'var(--text-secondary)',
                      marginLeft: 'var(--space-2)'
                    }}
                  >
                    {session.messages.length} 条
                  </span>
                </div>

                {/* 最近消息预览（两行截断） */}
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.4
                  }}
                >
                  {lastMsg
                    ? lastMsg.type === 'image'
                      ? '[图片]'
                      : lastMsg.type === 'card'
                        ? '[商品卡片]'
                        : lastMsg.content || '暂无消息'
                    : '暂无消息'}
                </div>
              </div>
            </button>

            {/* 商品主图缩略图 */}
            {(() => {
              const product = session.chatInfo.itemId
                ? products.get(session.chatInfo.itemId)
                : undefined
              const placeholder = (
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--text-xs)'
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )
              if (!product?.mainImageUrl) return placeholder
              return (
                <>
                  <img
                    src={product.mainImageUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      const el = e.currentTarget
                      el.style.display = 'none'
                      const fallback = el.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div style={{ display: 'none' }}>{placeholder}</div>
                </>
              )
            })()}

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
