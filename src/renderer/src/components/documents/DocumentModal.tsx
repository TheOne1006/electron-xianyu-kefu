import { useState } from 'react'

interface DocumentModalProps {
  title: string
  initialKey: string
  initialContent: string
  onSave: (key: string, content: string) => void
  onClose: () => void
}

/**
 * 文档新增/编辑弹窗。
 */
export function DocumentModal({
  title,
  initialKey,
  initialContent,
  onSave,
  onClose
}: DocumentModalProps): React.JSX.Element {
  const [key, setKey] = useState(initialKey)
  const [content, setContent] = useState(initialContent)
  const isEdit = initialKey !== ''

  /**
   * 提交文档表单，并在字段非空时触发保存。
   */
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (!key.trim() || !content.trim()) return
    onSave(key.trim(), content.trim())
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel documents-page__modal-panel">
        <h3 className="modal-title">{title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">标题 *</label>
            <input
              type="text"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="input-field"
              required
              disabled={isEdit}
            />
          </div>
          <div className="form-group">
            <label className="form-label">内容 *</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              className="textarea-field"
              required
            />
          </div>
          <div className="modal-actions">
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
