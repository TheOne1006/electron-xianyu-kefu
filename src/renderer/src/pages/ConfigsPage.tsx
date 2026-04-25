import { useConfigsPage } from './configs-page-model'
import { PageCenteredWrapper } from '../components/PageCenteredWrapper'
import { DataManagementSection } from '../components/configs/DataManagementSection'
import { WebhookSection } from '../components/configs/WebhookSection'

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

  return (
    <PageCenteredWrapper maxWidth="1200px" padding="var(--space-5) var(--space-4)">
      <DataManagementSection />
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

        <WebhookSection
          value={config.orderWebhookUrl ?? ''}
          loading={loading}
          saving={saving}
          onChange={handleFieldChange}
        />

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
    </PageCenteredWrapper>
  )
}
