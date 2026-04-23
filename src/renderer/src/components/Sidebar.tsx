import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRightIcon, RouteIcon } from '../assets/icons/RouteIcon'
import { getVisibleRouteMetaList } from '../routes/route-meta'

const COMPACT_WIDTH = 64
const EXPANDED_WIDTH = 200

/**
 * 渲染可折叠的侧边栏导航。
 */
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
        {getVisibleRouteMetaList().map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.title}
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
              <span style={{ flexShrink: 0 }}>
                <RouteIcon iconKey={item.iconKey} />
              </span>
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
                  {item.title}
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
          <ChevronRightIcon
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease'
            }}
          />
        </button>
      </div>
    </nav>
  )
}
