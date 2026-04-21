import { useState, useRef, useEffect, useCallback } from 'react'

interface TagSelectOption {
  key: string
  label: string
}

interface TagSelectProps {
  options: TagSelectOption[]
  selectedKeys: string[]
  onChange: (selectedKeys: string[]) => void
  placeholder?: string
}

export function TagSelect({
  options,
  selectedKeys,
  onChange,
  placeholder = '搜索...'
}: TagSelectProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = useCallback(
    (key: string) => {
      if (!selectedKeys.includes(key)) {
        onChange([...selectedKeys, key])
      }
      setInputValue('')
      inputRef.current?.focus()
    },
    [selectedKeys, onChange]
  )

  const handleRemove = useCallback(
    (key: string) => {
      onChange(selectedKeys.filter((k) => k !== key))
    },
    [selectedKeys, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && inputValue === '' && selectedKeys.length > 0) {
        onChange(selectedKeys.slice(0, -1))
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    },
    [inputValue, selectedKeys, onChange]
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(inputValue.toLowerCase())
  )

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* 输入框区域 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-1)',
          minHeight: 36,
          padding: `${2}px ${4}px`,
          background: 'var(--bg-elevated)',
          border: `1px solid ${isOpen ? 'var(--border-active)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)',
          cursor: 'text',
          transition: 'border-color var(--duration-fast) var(--ease-default)'
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedKeys.map((key) => {
          const opt = options.find((o) => o.key === key)
          return (
            <span
              key={key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '1px 6px',
                fontSize: 'var(--text-caption)',
                lineHeight: '20px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--brand-primary)',
                borderRadius: 'var(--radius-sm)',
                whiteSpace: 'nowrap'
              }}
            >
              {opt?.label ?? key}
              <span
                style={{
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  opacity: 0.7
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(key)
                }}
              >
                ×
              </span>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedKeys.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: 80,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-body)',
            fontFamily: 'var(--font-sans)',
            height: 28,
            padding: 0
          }}
        />
      </div>

      {/* 下拉列表 */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 200,
            overflow: 'auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1050
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-3)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}
            >
              {selectedKeys.length === options.length ? '已全部选择' : '无匹配文档'}
            </div>
          ) : (
            filtered.map((opt) => {
              const isSelected = selectedKeys.includes(opt.key)
              return (
                <div
                  key={opt.key}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    fontSize: 'var(--text-body)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: isSelected ? 'var(--text-secondary)' : 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                  onClick={() => {
                    if (!isSelected) handleSelect(opt.key)
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <span style={{ color: 'var(--brand-primary)', fontSize: 'var(--text-caption)' }}>
                      ✓ 已选
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
