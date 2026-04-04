import { Link } from 'react-router-dom'

export function NotFoundPage(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--space-4)',
        color: 'var(--text-secondary)'
      }}
    >
      <span style={{ fontSize: '64px', lineHeight: 1 }}>404</span>
      <p style={{ fontSize: 'var(--text-lg)', margin: 0 }}>页面不存在</p>
      <Link
        to="/"
        style={{
          color: 'var(--brand-primary)',
          textDecoration: 'none',
          fontSize: 'var(--text-sm)'
        }}
      >
        返回首页
      </Link>
    </div>
  )
}
