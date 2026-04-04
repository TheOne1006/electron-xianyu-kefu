import { ConfigForm } from '../components/ConfigForm'

export function ConfigsPage(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--space-5) var(--space-4)',
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        <ConfigForm />
      </div>
    </div>
  )
}
