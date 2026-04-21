import { useState, useEffect } from 'react'
import type { AppConfig } from '@shared/types'

export function ConfigForm(): React.JSX.Element {
  const [config, setConfig] = useState<AppConfig>({
    model: 'MiniMax-M2.7',
    baseURL: 'https://api.minimaxi.com/v1',
    apiKey: '',
    humanTakeoverKeywords: '',
    browserUrl: 'https://goofish.com',
    safetyFilterBlockedKeywords: ['微信', 'QQ', '支付宝转账', '银行卡', '线下交易', '加我'],
    safetyFilterReplacement: '[安全提醒]请通过平台沟通哦~',
    orderWebhookUrl: ''
  })
  const [saving, setSaving] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')

  useEffect(() => {
    window.electron.config.get().then((savedConfig: AppConfig) => {
      if (savedConfig) {
        setConfig(savedConfig)
        setKeywordInput((savedConfig.safetyFilterBlockedKeywords || []).join(', '))
      }
    })
  }, [])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.electron.config.save(config)
    } catch (error) {
      console.error('保存配置失败:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof AppConfig, value: string | string[]): void => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleKeywordAdd = (): void => {
    const keywords = keywordInput
      .split(/[,，]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
    setConfig((prev) => ({ ...prev, safetyFilterBlockedKeywords: keywords }))
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--space-4)',
        alignItems: 'start',
        width: '100%'
      }}
    >
      {/* 左列：LLM 配置 */}
      <section className="card">
        <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>
          模型设置
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-3)'
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Model</label>
            <input
              type="text"
              className="input-field"
              value={config.model}
              onChange={(e) => handleChange('model', e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Base URL</label>
            <input
              type="text"
              className="input-field"
              value={config.baseURL}
              onChange={(e) => handleChange('baseURL', e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">API Key</label>
            <input
              type="password"
              className="input-field"
              value={config.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      {/* 右列：安全过滤 */}
      <section className="card">
        <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>
          安全过滤
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-3)'
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">敏感词（逗号分隔）</label>
            <input
              type="text"
              className="input-field"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onBlur={handleKeywordAdd}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleKeywordAdd()
                }
              }}
              placeholder="微信, QQ, 银行卡"
            />
            <p className="form-hint">消息中包含这些关键词时将被替换为 ***</p>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">替换字符</label>
            <input
              type="text"
              className="input-field"
              value={config.safetyFilterReplacement}
              onChange={(e) => handleChange('safetyFilterReplacement', e.target.value)}
            />
            <p className="form-hint">敏感词的替换字符</p>
          </div>
        </div>
      </section>

      {/* 左列：人工接管设置 */}
      <section className="card">
        <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>
          人工接管设置
        </h2>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">触发字符</label>
          <input
            type="text"
            className="input-field"
            value={config.humanTakeoverKeywords}
            onChange={(e) => handleChange('humanTakeoverKeywords', e.target.value)}
          />
          <p className="form-hint">检测到此字符时判定为人工接管，跳过 AI 回复</p>
        </div>
      </section>

      {/* 右列：浏览器设置 */}
      <section className="card">
        <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>
          浏览器设置
        </h2>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">加载链接</label>
          <input
            type="text"
            className="input-field"
            value={config.browserUrl}
            onChange={(e) => handleChange('browserUrl', e.target.value)}
            placeholder="https://goofish.com"
          />
          <p className="form-hint">浏览器窗口启动时加载的网址，留空则使用默认链接</p>
        </div>
      </section>

      {/* 订单通知设置 */}
      <section className="card">
        <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>
          订单通知设置
        </h2>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Webhook URL</label>
          <input
            type="text"
            className="input-field"
            value={config.orderWebhookUrl ?? ''}
            onChange={(e) => handleChange('orderWebhookUrl', e.target.value)}
            placeholder="https://example.com/notify?product=<title>"
          />
          <p className="form-hint">
            检测到支付事件时调用此 URL，{'<title>'} 将替换为商品名称
          </p>
        </div>
      </section>

      {/* 保存按钮 - 占据整行 */}
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-block btn-lg">
          {saving ? '保存中...' : '保存设置'}
        </button>
      </section>
    </div>
  )
}
