import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navItems = [
  {
    path: '/',
    label: '设置',
    icon: (
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
        <path d="M12.22 2h-.01a2.01 2.01 0 0 1 .81 1.46 1.34L8.64 7.46a2 2 0 0 1 .81-1.46L15.18 2.18a2 2 0 0 0-1.52-.01L12.22 2Z" />
        <path d="M13.76 3.53l1.41 1.41-1.41 1.41" />
        <path d="M7.29 17.71l1.41 1.41-1.41 1.41" />
        <path d="M14.12 3.88l.88.88" />
        <path d="M5.58 17.41l.88.88" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  },
  {
    path: '/agent-config',
    label: 'Agent',
    icon: (
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
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    )
  },
  {
    path: '/products',
    label: '产品',
    icon: (
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
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  },
  {
    path: '/documents',
    label: '文档库',
    icon: (
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
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    )
  },
  {
    path: '/conversations',
    label: '对话',
    icon: (
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
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  },
  {
    path: '/quick-start',
    label: '快速开始',
    icon: (
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
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  },
  {
    path: '/q-and-a',
    label: 'Q&A',
    icon: (
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
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
]

const COMPACT_WIDTH = 64
const EXPANDED_WIDTH = 200

export function Sidebar(): React.JSX.Element {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return localStorage.getItem('sidebar-expanded') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', String(isExpanded))
  }, [isExpanded])

  const toggleExpanded = (): void => {
    setIsExpanded(!isExpanded)
  }

  return (
    <nav
      style={{
        width: isExpanded ? EXPANDED_WIDTH : COMPACT_WIDTH,
        flexShrink: 0,
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 200ms ease',
        overflow: 'hidden'
      }}
    >
      {/* 导航项区域 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'var(--space-4)',
          paddingLeft: isExpanded ? 'var(--space-3)' : '10px',
          paddingRight: isExpanded ? 'var(--space-3)' : '10px',
          gap: 'var(--space-1)',
          overflow: 'hidden'
        }}
      >
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              style={{
                width: isExpanded ? 'calc(100% - 6px)' : '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                paddingLeft: isExpanded ? '12px' : '0',
                gap: '12px',
                borderRadius: 'var(--radius-md)',
                color: active ? 'var(--brand-primary)' : 'var(--text-secondary)',
                backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: active ? '3px solid var(--brand-primary)' : '3px solid transparent',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all var(--duration-fast) var(--ease-default)',
                flexShrink: 0,
                boxSizing: 'border-box'
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {isExpanded && (
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: active ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: active ? 'var(--brand-primary)' : 'var(--text-primary)'
                  }}
                >
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* 底部切换按钮 */}
      <div
        style={{
          padding: 'var(--space-3)',
          display: 'flex',
          justifyContent: isExpanded ? 'flex-end' : 'center',
          borderTop: '1px solid var(--border-default)'
        }}
      >
        <button
          onClick={toggleExpanded}
          title={isExpanded ? '收起' : '展开'}
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all var(--duration-fast) var(--ease-default)'
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
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease'
            }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
