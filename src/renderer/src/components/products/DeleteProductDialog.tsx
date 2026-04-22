interface DeleteProductDialogProps {
  productId: string | null
  onConfirm: (id: string) => void
  onClose: () => void
}

/**
 * 产品删除确认弹窗。
 */
export function DeleteProductDialog({
  productId,
  onConfirm,
  onClose
}: DeleteProductDialogProps): React.JSX.Element | null {
  if (!productId) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <h3 className="modal-title">确认删除</h3>
        <p className="modal-description">确定要删除产品 {productId} 吗？此操作不可撤销。</p>
        <div className="modal-actions">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary btn-sm text-danger" onClick={() => onConfirm(productId)}>
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
