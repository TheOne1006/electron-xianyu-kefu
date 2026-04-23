import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { SessionList } from '../components/ConversationComponents/SessionList'
import { MessageList } from '../components/ConversationComponents/MessageList'
import { Input } from '../components/ConversationComponents/Input'
import { ResizableSplit } from '../components/ResizableSplit'
import { useToast } from '../contexts/ToastContext'
import type { Conversation, Product, SendMessageResult } from '@shared/types'

export function ConversationsPage(): React.JSX.Element {
  const [sessions, setSessions] = useState<Conversation[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [leftWidth, setLeftWidth] = useState(280)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { showToast } = useToast()

  const productsMap = useMemo(() => {
    const map = new Map<string, Product>()
    products.forEach((p) => map.set(p.id, p))
    return map
  }, [products])

  const loadSessions = useCallback(async () => {
    setError(null)
    try {
      const data = await window.electron.conversation.list()
      setSessions(data)
    } catch {
      setError('加载会话列表失败')
    }
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const data = await window.electron.product.list()
      setProducts(data)
    } catch {
      // 商品加载失败不阻塞页面
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
      } else {
        setError('会话不存在')
      }
    } catch {
      setError('加载消息失败')
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
    loadProducts()
  }, [loadSessions, loadProducts])

  const handleSend = async (content: string): Promise<SendMessageResult> => {
    if (!selectedChatId) return { success: false, error: '未选择会话' }

    try {
      const result = await window.electron.replyQueue.enqueue(selectedChatId, content)
      if (result.code === 0) {
        await loadConversation(selectedChatId)
        await loadSessions()
        return { success: true }
      }
      return { success: false, error: result.message || '发送失败' }
    } catch {
      return { success: false, error: '发送失败' }
    }
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
        }
      }
    } catch {
      showToast('error', '删除会话失败')
    }
  }

  // 获取当前会话关联的商品信息
  const currentProduct = conversation?.chatInfo.itemId
    ? productsMap.get(conversation.chatInfo.itemId)
    : undefined

  // 右侧面板内容
  const rightPanel = selectedChatId ? (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部栏 — 显示当前会话用户名 + 商品信息 */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 600,
            margin: 0,
            color: 'var(--text-primary)'
          }}
        >
          {conversation?.chatInfo.userName || '聊天记录'}
        </h2>
        {currentProduct && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {currentProduct.title}
          </span>
        )}
      </div>

      <MessageList
        messages={conversation?.messages || []}
        isLoading={messagesLoading}
        error={error}
        onRetry={() => selectedChatId && loadConversation(selectedChatId)}
      />

      <Input onSend={handleSend} disabled={!selectedChatId} />
    </div>
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)'
      }}
    >
      <div style={{ textAlign: 'center', opacity: 0.6 }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ margin: '0 auto var(--space-4)' }}
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
          选择一个会话开始查看
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>
          从左侧列表点击会话
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部栏 */}
      <div
        style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>聊天记录</h2>
      </div>

      {/* 主体区域 — 可拖拽双面板 */}
      <ResizableSplit
        leftWidth={leftWidth}
        onLeftWidthChange={setLeftWidth}
        left={
          <SessionList
            sessions={sessions}
            selectedId={selectedChatId}
            onSelect={loadConversation}
            isLoading={false}
            error={error}
            onRetry={loadSessions}
            onDelete={handleDelete}
            products={productsMap}
          />
        }
        right={rightPanel}
      />
    </div>
  )
}
