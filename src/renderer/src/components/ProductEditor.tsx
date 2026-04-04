import { useState } from 'react'

interface ProductEditorProps {
  content: string
  onSave: (content: string) => void
  onChange: (content: string) => void
  onReset: () => void
}

export function ProductEditor({
  content,
  onSave,
  onChange,
  onReset
}: ProductEditorProps): React.JSX.Element {
  const [localContent, setLocalContent] = useState(content)
  const [error, setError] = useState('')

  const validate = (text: string): string | null => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return 'JSON 格式无效'
    }
    if (!Array.isArray(parsed)) return '必须是数组格式'
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) return '每个 item 必须是对象'
      if (!('id' in item)) return '每个 item 必须包含 "id" 字段'
      if (!('content' in item)) return '每个 item 必须包含 "content" 字段'
    }
    return null
  }

  const handleChange = (value: string): void => {
    setLocalContent(value)
    setError('')
    onChange(value)
  }

  const handleReset = (): void => {
    setLocalContent(content)
    setError('')
    onReset()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 'var(--space-2)'
        }}
      >
        <button onClick={handleReset} className="btn btn-secondary btn-sm">
          重置默认
        </button>
      </div>
      {error && (
        <div
          style={{
            color: 'var(--color-danger)',
            fontSize: 'var(--text-caption)',
            marginBottom: 'var(--space-2)'
          }}
        >
          {error}
        </div>
      )}
      <textarea
        key={content}
        defaultValue={content}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => {
          const err = validate(localContent)
          if (err) {
            setError(err)
            return
          }
          if (localContent !== content) onSave(localContent)
        }}
        style={{
          flex: 1,
          padding: 'var(--space-3)',
          fontSize: 'var(--text-code)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 'var(--leading-relaxed)',
          resize: 'none',
          color: 'var(--text-primary)',
          background: 'var(--bg-base)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)',
          outline: 'none',
          transition: 'border-color var(--duration-fast) var(--ease-default)'
        }}
      />
    </div>
  )
}
