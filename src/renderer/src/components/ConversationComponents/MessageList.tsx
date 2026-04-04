import type { ChatMessage } from '@shared/types'

interface ChatMessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function MessageList({
  messages,
  isLoading = false,
  error = null,
  onRetry
}: ChatMessageListProps): React.JSX.Element {
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

  if (messages.length === 0) {
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
        <div>暂无消息</div>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1, padding: 'var(--space-3)' }}>
      {messages.map((msg, msgIndex) => {
        // isSelf === true 表示自己发的消息（显示在右侧）
        // isSelf === false 表示对方发的消息（显示在左侧）
        const isUser = !msg.isSelf

        return (
          <div
            key={msgIndex}
            style={{
              display: 'flex',
              flexDirection: isUser ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              marginBottom: 'var(--space-2)'
            }}
          >
            {/* 头像 */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: isUser ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginLeft: isUser ? 'var(--space-2)' : 0,
                marginRight: isUser ? 0 : 'var(--space-2)',
                color: isUser ? 'white' : 'var(--text-secondary)',
                fontSize: 'var(--text-xs)'
              }}
            >
              {isUser ? 'U' : 'AI'}
            </div>

            {/* 消息气泡 */}
            <div
              style={{
                maxWidth: '70%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: isUser ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                color: isUser ? 'white' : 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.5,
                wordBreak: 'break-word'
              }}
            >
              {msg.type === 'text' && msg.content}
              {msg.type === 'image' && msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="图片消息"
                  referrerPolicy="no-referrer"
                  style={{ maxWidth: '200px', borderRadius: 'var(--radius-md)' }}
                  onError={(e) => {
                    const el = e.currentTarget
                    el.style.display = 'none'
                    const fallback = document.createElement('span')
                    fallback.textContent = '图片加载失败'
                    fallback.style.fontSize = 'var(--text-xs)'
                    fallback.style.opacity = '0.6'
                    el.parentElement?.appendChild(fallback)
                  }}
                />
              )}
              {msg.type === 'card' && msg.cardInfo && (
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  <div style={{ fontWeight: 600 }}>{msg.cardInfo.title}</div>
                  <div
                    style={{ color: isUser ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}
                  >
                    {msg.cardInfo.price}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
