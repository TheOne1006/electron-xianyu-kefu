import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useConfigsPage } from './configs-page-model'

/**
 * 渲染应用配置页，并在页面层维护表单状态与保存行为。
 */
export function ConfigsPage(): React.JSX.Element {
  const {
    config,
    keywordInput,
    loading,
    saving,
    setKeywordInput,
    handleFieldChange,
    commitKeywordInput,
    handleSave
  } = useConfigsPage()

  const [dataExpanded, setDataExpanded] = useState(false)

  const { showToast } = useToast()

  async function handleExport(): Promise<void> {
    const result = await window.electron.data.exportData()
    if (result.code === 0) {
      showToast('success', `数据已导出到: ${result.data}`)
    } else if (result.code !== 1) {
      showToast('error', result.message)
    }
  }

  async function handleImport(): Promise<void> {
    const confirmed = window.confirm(
      '导入将覆盖当前所有数据（应用配置、Agent 配置、文档库、商品目录），是否继续？'
    )
    if (!confirmed) return

    const result = await window.electron.data.importData()
    if (result.code === 0) {
      showToast('success', '数据导入成功')
    } else {
      showToast('error', result.message)
    }
  }

  async function handleOpenDir(): Promise<void> {
    await window.electron.data.openDir()
  }

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
        <section className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div
            onClick={() => setDataExpanded(!dataExpanded)}
            aria-expanded={dataExpanded}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <h2 className="h2" style={{ margin: 0 }}>
              数据管理
            </h2>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                flexShrink: 0,
                transform: dataExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease-in-out',
                color: 'var(--text-secondary)'
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            style={{
              maxHeight: dataExpanded ? '200px' : '0',
              overflow: 'hidden',
              transition: 'max-height 250ms ease-in-out'
            }}
          >
            <div style={{ paddingTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <button onClick={() => void handleExport()} className="btn btn-primary">
                  导出数据
                </button>
                <button onClick={() => void handleImport()} className="btn btn-primary">
                  导入数据
                </button>
                <button onClick={() => void handleOpenDir()} className="btn btn-primary">
                  打开数据目录
                </button>
              </div>
              <p className="form-hint" style={{ marginTop: 'var(--space-3)' }}>
                导出/导入范围：应用配置、Agent 配置、文档库、商品目录
              </p>
            </div>
          </div>
        </section>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
            alignItems: 'start',
            width: '100%'
          }}
        >
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
                  onChange={(e) => handleFieldChange('model', e.target.value)}
                  disabled={loading || saving}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Base URL</label>
                <input
                  type="text"
                  className="input-field"
                  value={config.baseURL}
                  onChange={(e) => handleFieldChange('baseURL', e.target.value)}
                  disabled={loading || saving}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  className="input-field"
                  value={config.apiKey}
                  onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                  autoComplete="off"
                  disabled={loading || saving}
                />
              </div>
            </div>
          </section>

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
                  onBlur={commitKeywordInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitKeywordInput()
                    }
                  }}
                  placeholder="微信, QQ, 银行卡"
                  disabled={loading || saving}
                />
                <p className="form-hint">消息中包含这些关键词时将被替换为 ***</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">替换字符</label>
                <input
                  type="text"
                  className="input-field"
                  value={config.safetyFilterReplacement}
                  onChange={(e) => handleFieldChange('safetyFilterReplacement', e.target.value)}
                  disabled={loading || saving}
                />
                <p className="form-hint">敏感词的替换字符</p>
              </div>
            </div>
          </section>

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
                onChange={(e) => handleFieldChange('humanTakeoverKeywords', e.target.value)}
                disabled={loading || saving}
              />
              <p className="form-hint">检测到此字符时判定为人工接管，跳过 AI 回复</p>
            </div>
          </section>

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
                onChange={(e) => handleFieldChange('browserUrl', e.target.value)}
                placeholder="https://goofish.com"
                disabled={loading || saving}
              />
              <p className="form-hint">浏览器窗口启动时加载的网址，留空则使用默认链接</p>
            </div>
          </section>

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
                onChange={(e) => handleFieldChange('orderWebhookUrl', e.target.value)}
                placeholder="https://example.com/notify?product=<title>"
                disabled={loading || saving}
              />
              <p className="form-hint">检测到支付事件时调用此 URL，{'<title>'} 将替换为商品名称</p>
            </div>
          </section>

          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <button
              onClick={() => void handleSave()}
              disabled={loading || saving}
              className="btn btn-primary btn-block btn-lg"
            >
              {saving ? '保存中...' : loading ? '加载中...' : '保存设置'}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
