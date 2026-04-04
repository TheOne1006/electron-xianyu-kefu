import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'info'
type ToastMessage = {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toasts: ToastMessage[]
  showToast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: string, duration: number = 3000) => {
      const id = Date.now().toString()
      const newToast: ToastMessage = { id, type, message, duration: duration ?? 3000 }
      // 最多保留 1 条，新消息替换旧消息
      setToasts((prev) => (prev.length > 0 ? [] : prev))
      setToasts((prev) => [...prev, newToast])
      const timer = setTimeout(() => removeToast(id), duration)
      timersRef.current.set(id, timer)
    },
    [removeToast]
  )

  return <ToastContext.Provider value={{ toasts, showToast }}>{children}</ToastContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ToastContainer 组件
export function ToastContainer(): React.JSX.Element {
  const { toasts } = useToast()
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-body)',
            color: '#fff',
            background:
              toast.type === 'success'
                ? 'var(--color-success)'
                : toast.type === 'error'
                  ? 'var(--color-danger)'
                  : 'var(--brand-primary)',
            boxShadow: 'var(--shadow-md)',
            pointerEvents: 'auto',
            animation: 'toast-in 300ms ease-out'
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>,
    document.body
  )
}
