import { useState, useEffect, useCallback, useRef } from 'react'
import { SessionList } from '../components/ConversationComponents/SessionList'
import { MessageList } from '../components/ConversationComponents/MessageList'
import { Input } from '../components/ConversationComponents/Input'
import { useToast } from '../contexts/ToastContext'
import type { Conversation, SendMessageResult } from '@shared/types'

type ViewState = 'idle' | 'loading' | 'error' | 'viewing'

export function ConversationsPage(): React.JSX.Element {
  const [sessions, setSessions] = useState<Conversation[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [viewState, setViewState] = useState<ViewState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { showToast } = useToast()

  const loadSessions = useCallback(async () => {
    setError(null)
    try {
      const data = await window.electron.conversation.list()
      setSessions(data)
    } catch {
      setError('加载会话列表失败')
      setViewState('error')
    }
  }, [])

  const loadConversation = useCallback(async (chatId: string) => {
    setMessagesLoading(true)
    setError(null)
    setSelectedChatId(chatId)
    try {
      const data = await window.electron.conversation.getById(chatId)
      if (data) {
        setConversation(data)
        setViewState('viewing')
      } else {
        setError('会话不存在')
        setViewState('error')
      }
    } catch {
      setError('加载消息失败')
      setViewState('error')
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  // 选中聊天后，每 10 秒自动刷新对话数据
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (!selectedChatId) return

    intervalRef.current = setInterval(() => {
      loadConversation(selectedChatId)
    }, 10_000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [selectedChatId, loadConversation])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleSend = async (content: string): Promise<SendMessageResult> => {
    if (!selectedChatId) return { success: false, error: '未选择会话' }

    try {
      const result = await window.electron.replyQueue.enqueue(selectedChatId, content)
      if (result.code === 0) {
        // 重新加载消息
        await loadConversation(selectedChatId)
        // 重新加载会话列表（更新最后消息预览）
        await loadSessions()
        return { success: true }
      }
      return { success: false, error: result.message || '发送失败' }
    } catch {
      return { success: false, error: '发送失败' }
    }
  }

  const handleClose = (): void => {
    setSelectedChatId(null)
    setConversation(null)
    setViewState('idle')
  }

  const handleDelete = async (chatId: string): Promise<void> => {
    if (!confirm('确定要删除这个会话吗？')) return

    try {
      const result = await window.electron.conversation.delete(chatId)
      if (result) {
        await loadSessions()
        if (selectedChatId === chatId) {
          setSelectedChatId(null)
          setConversation(null)
          setViewState('idle')
        }
      }
    } catch {
      showToast('error', '删除会话失败')
    }
  }

  // 未选中会话时的空状态
  if (!selectedChatId && viewState !== 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>聊天记录</h2>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {/* 左侧会话列表 */}
          <div
            style={{
              width: '280px',
              flexShrink: 0,
              borderRight: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <SessionList
              sessions={sessions}
              selectedId={null}
              onSelect={loadConversation}
              isLoading={false}
              error={viewState === 'error' ? error : null}
              onRetry={loadSessions}
              onDelete={handleDelete}
            />
          </div>

          {/* 右侧空状态 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ margin: '0 auto var(--space-3)', opacity: 0.5 }}
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div>选择一个会话开始查看</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部栏 */}
      <div
        style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}
      >
        <button
          onClick={handleClose}
          style={{
            padding: 'var(--space-1)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>
          {conversation?.chatInfo.userName || '聊天记录'}
        </h2>
      </div>

      {/* 主体区域 — 全宽消息视图，不再显示左侧会话列表 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <MessageList
          messages={conversation?.messages || []}
          isLoading={messagesLoading}
          error={viewState === 'error' ? error : null}
          onRetry={() => selectedChatId && loadConversation(selectedChatId)}
        />

        <Input onSend={handleSend} disabled={viewState !== 'viewing'} />
      </div>
    </div>
  )
}
