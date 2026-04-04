import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'

export function DocumentsPage(): React.JSX.Element {
  const [documents, setDocuments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { showToast } = useToast()

  const loadDocuments = useCallback(async () => {
    try {
      const data = await window.electron.document.all()
      setDocuments(data)
    } catch (error) {
      showToast('error', `加载文档失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleAdd = async (key: string, content: string): Promise<void> => {
    try {
      await window.electron.document.upsert(key, content)
      showToast('success', '添加成功')
      setShowAddModal(false)
      loadDocuments()
    } catch (error) {
      showToast('error', `添加失败: ${error}`)
    }
  }

  const handleEdit = async (key: string, content: string): Promise<void> => {
    try {
      await window.electron.document.upsert(key, content)
      showToast('success', '保存成功')
      setEditKey(null)
      loadDocuments()
    } catch (error) {
      showToast('error', `保存失败: ${error}`)
    }
  }

  const handleDelete = async (key: string): Promise<void> => {
    try {
      await window.electron.document.delete(key)
      showToast('success', '删除成功')
      setDeleteConfirm(null)
      loadDocuments()
    } catch (error) {
      showToast('error', `删除失败: ${error}`)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-secondary)'
        }}
      >
        加载中...
      </div>
    )
  }

  const entries = Object.entries(documents)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-4)'
      }}
    >
      {/* 头部 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: 'var(--space-4)'
        }}
      >
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          新增文档
        </button>
      </div>

      {/* 表格 */}
      {entries.length === 0 ? (
        <div
          style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-8)' }}
        >
          暂无文档
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: 'var(--space-2) var(--space-3)',
                    fontWeight: 600
                  }}
                >
                  标题
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: 'var(--space-2) var(--space-3)',
                    fontWeight: 600
                  }}
                >
                  内容预览
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: 'var(--space-2) var(--space-3)',
                    fontWeight: 600
                  }}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, content]) => (
                <tr key={key} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: 'var(--space-2) var(--space-3)' }}>{key}</td>
                  <td
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      color: 'var(--text-secondary)',
                      maxWidth: 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={content}
                  >
                    {content}
                  </td>
                  <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: 'var(--space-2)' }}
                      onClick={() => setEditKey(key)}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => setDeleteConfirm(key)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增弹窗 */}
      {showAddModal && (
        <DocumentModal
          title="新增文档"
          initialKey=""
          initialContent=""
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 编辑弹窗 */}
      {editKey !== null && (
        <DocumentModal
          title="编辑文档"
          initialKey={editKey}
          initialContent={documents[editKey] ?? ''}
          onSave={handleEdit}
          onClose={() => setEditKey(null)}
        />
      )}

      {/* 删除确认 */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: 400
            }}
          >
            <h3 style={{ margin: '0 0 var(--space-4) 0' }}>确认删除</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              确定要删除文档「{deleteConfirm}」吗？此操作不可撤销。
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>
                取消
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ backgroundColor: 'var(--color-danger)' }}
                onClick={() => handleDelete(deleteConfirm)}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DocumentModal 子组件 ─────────────────────────────────────

interface DocumentModalProps {
  title: string
  initialKey: string
  initialContent: string
  onSave: (key: string, content: string) => void
  onClose: () => void
}

function DocumentModal({
  title,
  initialKey,
  initialContent,
  onSave,
  onClose
}: DocumentModalProps): React.JSX.Element {
  const [key, setKey] = useState(initialKey)
  const [content, setContent] = useState(initialContent)
  const isEdit = initialKey !== ''

  const handleSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault()
    if (!key.trim() || !content.trim()) return
    onSave(key.trim(), content.trim())
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: 500,
          width: '100%'
        }}
      >
        <h3 style={{ margin: '0 0 var(--space-4) 0' }}>{title}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500
              }}
            >
              标题 *
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="input-field"
              required
              disabled={isEdit}
            />
          </div>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500
              }}
            >
              内容 *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="textarea-field"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {isEdit ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
