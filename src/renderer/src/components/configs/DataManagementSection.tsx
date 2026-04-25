import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { ChevronIcon } from '../ChevronIcon'

/**
 * 数据管理手风琴区域 — 导出、导入、打开数据目录。
 */
export function DataManagementSection(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
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
    <section className="card" style={{ marginBottom: 'var(--space-4)' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-controls="data-management-content"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <h2 className="h2" id="data-management-title" style={{ margin: 0 }}>
          数据管理
        </h2>
        <ChevronIcon expanded={expanded} />
      </div>
      <div
        id="data-management-content"
        role="region"
        aria-labelledby="data-management-title"
        style={{
          maxHeight: expanded ? '200px' : '0',
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
  )
}
