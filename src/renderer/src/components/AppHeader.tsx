import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const pageTitles: Record<string, string> = {
  '/configs': '设置',
  '/prompts': '提示词管理',
  '/chats': '聊天记录',
  '/products': '产品',
  '/agent-config': 'Agent',
  '/conversations': '对话',
  '/documents': '文档库'
}

export function AppHeader(): React.JSX.Element {
  const location = useLocation()
  const [launching, setLaunching] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const handleLaunchBrowser = async (): Promise<void> => {
    setLaunching(true)
    try {
      const config = await window.electron.config.get()
      await window.electron.browser.launch(config)
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error))
    } finally {
      setLaunching(false)
    }
  }

  return (
    <header
      style={{
        height: '48px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 'var(--space-4)',
        paddingRight: 'var(--space-4)',
        borderBottom: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-surface)'
      }}
    >
      <h1
        style={{
          fontSize: 'var(--text-h1)',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0
        }}
      >
        {pageTitles[location.pathname] ?? '闲鱼客服'}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all var(--duration-fast) var(--ease-default)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.borderColor = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.borderColor = 'var(--border-default)'
          }}
          title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* 启动浏览器按钮 — 特殊样式，突出层级 */}
        <button
          onClick={handleLaunchBrowser}
          disabled={launching}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '34px',
            padding: '0 14px',
            fontSize: 'var(--text-body)',
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            color: '#fff',
            background: launching
              ? 'var(--bg-elevated)'
              : 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: launching ? 'not-allowed' : 'pointer',
            opacity: launching ? 0.7 : 1,
            transition: 'all var(--duration-fast) var(--ease-default)',
            boxShadow: launching ? 'none' : '0 2px 8px rgba(245, 158, 11, 0.35)',
            minWidth: '110px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          {launching ? '启动中...' : '启动浏览器'}
        </button>
      </div>
    </header>
  )
}
