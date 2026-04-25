import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import type { AppConfig } from '@shared/types'

/**
 * Webhook URL 配置区域 — 包含输入框和测试按钮。
 */
export function WebhookSection({
  value,
  loading,
  saving,
  onChange
}: {
  value: string
  loading: boolean
  saving: boolean
  onChange: (field: keyof AppConfig, value: string) => void
}): React.JSX.Element {
  const [testing, setTesting] = useState(false)
  const { showToast } = useToast()

  async function handleTest(): Promise<void> {
    setTesting(true)
    try {
      const result = await window.electron.config.testWebhook()
      if (result.code === 0) {
        showToast('success', `测试成功 (${result.data.status} ${result.data.statusText})`)
      } else {
        showToast('error', result.message)
      }
    } catch {
      showToast('error', '测试请求异常')
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="card">
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>
        订单通知设置
      </h2>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Webhook URL</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <input
            type="text"
            className="input-field"
            value={value}
            onChange={(e) => onChange('orderWebhookUrl', e.target.value)}
            placeholder="https://example.com/notify?product=<title>"
            disabled={loading || saving}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => void handleTest()}
            disabled={loading || saving || testing}
            className="btn btn-primary"
            title="发送测试请求（title=demo）"
            style={{ flexShrink: 0 }}
          >
            {testing ? '测试中...' : '测试'}
          </button>
        </div>
        <p className="form-hint">检测到支付事件时调用此 URL，{'<title>'} 将替换为商品名称</p>
      </div>
    </section>
  )
}
