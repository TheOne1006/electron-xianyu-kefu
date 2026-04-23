import { useRef, useCallback } from 'react'

interface ResizableSplitProps {
  left: React.ReactNode
  right: React.ReactNode
  leftWidth: number
  onLeftWidthChange: (width: number) => void
  minLeftWidth?: number
}

export function ResizableSplit({
  left,
  right,
  leftWidth,
  onLeftWidthChange,
  minLeftWidth = 200
}: ResizableSplitProps): React.JSX.Element {
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true
      startX.current = e.clientX
      startWidth.current = leftWidth
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [leftWidth]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      const newWidth = Math.max(minLeftWidth, startWidth.current + delta)
      onLeftWidthChange(newWidth)
    },
    [minLeftWidth, onLeftWidthChange]
  )

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* 左侧面板 */}
      <div style={{ width: `${leftWidth}px`, flexShrink: 0, overflow: 'hidden' }}>{left}</div>

      {/* 分隔条 — 带 grip dots 拖拽指示器 */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          width: '12px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color var(--duration-fast)'
        }}
        onMouseEnter={(e) => {
          if (!isDragging.current) {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging.current) {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
          }
        }}
      >
        {/* Grip dots 指示器 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            opacity: 0.4
          }}
        >
          <div
            style={{
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              backgroundColor: 'var(--text-secondary)'
            }}
          />
          <div
            style={{
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              backgroundColor: 'var(--text-secondary)'
            }}
          />
          <div
            style={{
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              backgroundColor: 'var(--text-secondary)'
            }}
          />
        </div>
      </div>

      {/* 右侧面板 */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>{right}</div>
    </div>
  )
}
