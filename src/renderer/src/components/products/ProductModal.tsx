import { useState } from 'react'
import type { Product } from '@shared/types'
import { TagSelect } from '../TagSelect'

interface ProductModalProps {
  mode: 'add' | 'edit'
  initialProduct?: Product
  allDocuments: Record<string, string>
  onSave: (product: Product | Omit<Product, 'id'>) => void
  onClose: () => void
}

/**
 * 产品新增/编辑弹窗。
 */
export function ProductModal({
  mode,
  initialProduct,
  allDocuments,
  onSave,
  onClose
}: ProductModalProps): React.JSX.Element {
  const isEdit = mode === 'edit'
  const [title, setTitle] = useState(initialProduct?.title ?? '')
  const [content, setContent] = useState(initialProduct?.content ?? '')
  const [selectedDocs, setSelectedDocs] = useState<string[]>(initialProduct?.documentKeys ?? [])
  const [autoDeliver, setAutoDeliver] = useState(initialProduct?.autoDeliver ?? false)
  const [autoDeliverContent, setAutoDeliverContent] = useState(
    initialProduct?.autoDeliverContent ?? ''
  )

  /**
   * 提交产品表单，并根据模式生成对应的保存载荷。
   */
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (!title.trim()) return

    const documentKeys = selectedDocs.length > 0 ? selectedDocs : undefined

    if (isEdit && initialProduct) {
      onSave({
        ...initialProduct,
        title: title.trim(),
        content: content.trim() || undefined,
        documentKeys,
        autoDeliver,
        autoDeliverContent: autoDeliver ? autoDeliverContent.trim() : undefined
      })
      return
    }

    onSave({
      title: title.trim(),
      content: content.trim() || undefined,
      documentKeys,
      images: [],
      mainImageUrl: '',
      autoDeliver,
      autoDeliverContent: autoDeliver ? autoDeliverContent.trim() : undefined
    })
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel products-page__modal-panel">
        <h3 className="modal-title">{isEdit ? '编辑产品' : '新增产品'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              className="textarea-field"
            />
          </div>

          {isEdit && initialProduct && initialProduct.images.length > 0 && (
            <div className="form-group">
              <label className="form-label">图片列表</label>
              <div className="products-page__thumb-list">
                {initialProduct.images.map((url, index) => (
                  <img
                    key={url || index}
                    src={url}
                    alt={`图片${index + 1}`}
                    referrerPolicy="no-referrer"
                    className="products-page__thumb"
                    onClick={() => window.open(url, '_blank')}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {isEdit && initialProduct?.mainImageUrl && (
            <div className="form-group">
              <label className="form-label">主图</label>
              <img
                src={initialProduct.mainImageUrl}
                alt="主图"
                referrerPolicy="no-referrer"
                className="products-page__thumb"
                onClick={() => window.open(initialProduct.mainImageUrl, '_blank')}
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">关联文档</label>
            {Object.keys(allDocuments).length === 0 ? (
              <div className="card">暂无文档</div>
            ) : (
              <TagSelect
                options={Object.keys(allDocuments).map((key) => ({ key, label: key }))}
                selectedKeys={selectedDocs}
                onChange={setSelectedDocs}
                placeholder="搜索并选择关联文档..."
              />
            )}
          </div>

          <div className="form-group">
            <label className="products-page__checkbox">
              <input
                type="checkbox"
                checked={autoDeliver}
                onChange={(event) => setAutoDeliver(event.target.checked)}
              />
              <span className="products-page__checkbox-label">自动发货</span>
            </label>
            {autoDeliver && (
              <div className="products-page__auto-deliver">
                <textarea
                  value={autoDeliverContent}
                  onChange={(event) => setAutoDeliverContent(event.target.value)}
                  rows={3}
                  className="textarea-field"
                  placeholder="支付成功后自动发送给买家的内容"
                />
              </div>
            )}
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
