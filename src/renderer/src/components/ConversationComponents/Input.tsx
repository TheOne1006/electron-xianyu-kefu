import { useState } from 'react'
import type { SendMessageResult } from '@shared/types'

interface ChatInputProps {
  onSend: (content: string) => Promise<SendMessageResult>
  disabled?: boolean
}

export function Input({ onSend, disabled = false }: ChatInputProps): React.JSX.Element {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (): Promise<void> => {
    if (!content.trim() || isSending || disabled) return

    setIsSending(true)
    setError(null)

    try {
      const result = await onSend(content)
      if (result.success) {
        setContent('')
      } else {
        setError(result.error || '发送失败')
      }
    } catch {
      setError('发送失败，请重试')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = content.trim().length > 0 && !isSending && !disabled

  return (
    <div
      style={{
        padding: 'var(--space-3)',
        borderTop: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-surface)'
      }}
    >
      {error && (
        <div
          style={{
            padding: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-error, #ef4444)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)'
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={disabled || isSending}
          maxLength={2000}
          rows={3}
          style={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '120px',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            outline: 'none'
          }}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="btn btn-primary"
          style={{
            width: '44px',
            height: '44px',
            flexShrink: 0
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      <div
        style={{
          marginTop: 'var(--space-1)',
          fontSize: 'var(--text-xs)',
          color: content.length > 1800 ? 'var(--color-warning, #f59e0b)' : 'var(--text-secondary)',
          textAlign: 'right'
        }}
      >
        {content.length}/2000
      </div>
    </div>
  )
}
