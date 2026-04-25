import type { ReactNode } from 'react'

/**
 * 页面级居中布局容器，统一处理滚动、居中和最大宽度。
 */
export function PageCenteredWrapper({
  children,
  maxWidth = '680px',
  padding = 'var(--space-6) var(--space-4)'
}: {
  children: ReactNode
  maxWidth?: string
  padding?: string
}): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding,
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <div style={{ width: '100%', maxWidth }}>{children}</div>
    </div>
  )
}
