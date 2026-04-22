interface DeleteDocumentDialogProps {
  documentKey: string | null
  onConfirm: (key: string) => void
  onClose: () => void
}

/**
 * 文档删除确认弹窗。
 */
export function DeleteDocumentDialog({
  documentKey,
  onConfirm,
  onClose
}: DeleteDocumentDialogProps): React.JSX.Element | null {
  if (!documentKey) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-panel documents-page__modal-panel">
        <h3 className="modal-title">确认删除</h3>
        <p className="modal-description">
          确定要删除文档「{documentKey}」吗？此操作不可撤销。
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary btn-sm text-danger"
            onClick={() => onConfirm(documentKey)}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
