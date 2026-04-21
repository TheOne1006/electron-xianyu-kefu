import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { TagSelect } from '../components/TagSelect'
import type { Product } from '@shared/types'

/** 产品表格行：附带关联文档标题列表 */
interface ProductRow extends Product {
  _documentTitles: string[]
}

export function ProductsPage(): React.JSX.Element {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [allDocuments, setAllDocuments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [hoveredDoc, setHoveredDoc] = useState<{
    content: string
    x: number
    y: number
  } | null>(null)
  const { showToast } = useToast()

  const loadProducts = useCallback(async () => {
    try {
      const [data, docs] = await Promise.all([
        window.electron.product.list(),
        window.electron.document.all()
      ])
      setAllDocuments(docs)
      setProducts(
        data.map((p) => ({
          ...p,
          _documentTitles: (p.documentKeys ?? []).filter((k) => k in docs)
        }))
      )
    } catch (error) {
      showToast('error', `加载产品失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleAdd = async (product: Omit<Product, 'id'>): Promise<void> => {
    const id = Date.now().toString()
    try {
      await window.electron.product.upsert({ id, ...product })
      showToast('success', '添加成功')
      setShowAddModal(false)
      loadProducts()
    } catch (error) {
      showToast('error', `添加失败: ${error}`)
    }
  }

  const handleEdit = async (product: Product): Promise<void> => {
    try {
      await window.electron.product.upsert(product)
      showToast('success', '保存成功')
      setEditProduct(null)
      loadProducts()
    } catch (error) {
      showToast('error', `保存失败: ${error}`)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await window.electron.product.deleteById(id)
      showToast('success', '删除成功')
      setDeleteConfirm(null)
      loadProducts()
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-4)'
      }}
    >
      {/* 表格 */}
      {products.length === 0 ? (
        <div
          style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-8)' }}
        >
          暂无产品
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
                  ID
                </th>
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
                  主图
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: 'var(--space-2) var(--space-3)',
                    fontWeight: 600
                  }}
                >
                  文档
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    padding: 'var(--space-2) var(--space-3)',
                    fontWeight: 600
                  }}
                >
                  自动发货
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
              {products.map((product) => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-code)'
                    }}
                  >
                    {product.id}
                  </td>
                  <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                    {product.title.slice(0, 20)}
                  </td>
                  <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                    {product.mainImageUrl ? (
                      <img
                        src={product.mainImageUrl}
                        referrerPolicy="no-referrer"
                        width={100}
                        height={100}
                        style={{ objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                        onError={(e) => {
                          const el = e.currentTarget
                          el.style.display = 'none'
                          const fallback = document.createElement('span')
                          fallback.textContent = '-'
                          el.parentElement?.appendChild(fallback)
                        }}
                        // alt={product.title}
                      />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                    {product._documentTitles.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {product._documentTitles.map((docTitle) => {
                          const content = allDocuments[docTitle] ?? ''
                          return (
                            <span
                              key={docTitle}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setHoveredDoc({
                                  content,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top
                                })
                              }}
                              onMouseLeave={() => setHoveredDoc(null)}
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                fontSize: 'var(--text-xs)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-default)',
                                cursor: 'default'
                              }}
                            >
                              {docTitle}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'center' }}>
                    {product.autoDeliver ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          fontSize: 'var(--text-xs)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(82, 196, 26, 0.1)',
                          color: '#52c41a'
                        }}
                      >
                        已启用
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                        -
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      textAlign: 'right',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: 'var(--space-1)' }}
                      onClick={() => setEditProduct(product)}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => setDeleteConfirm(product.id)}
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
        <ProductModal
          mode="add"
          allDocuments={allDocuments}
          onSave={(data) => handleAdd(data as Omit<Product, 'id'>)}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 编辑弹窗 */}
      {editProduct && (
        <ProductModal
          mode="edit"
          initialProduct={editProduct}
          allDocuments={allDocuments}
          onSave={(data) => handleEdit(data as Product)}
          onClose={() => setEditProduct(null)}
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
              确定要删除产品 {deleteConfirm} 吗？此操作不可撤销。
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

      {/* 文档内容 Tooltip */}
      {hoveredDoc && (
        <div
          style={{
            position: 'fixed',
            left: hoveredDoc.x,
            top: hoveredDoc.y - 8,
            transform: 'translate(-50%, -100%)',
            maxWidth: 400,
            maxHeight: 300,
            overflow: 'auto',
            padding: 'var(--space-3)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            zIndex: 1100,
            pointerEvents: 'none'
          }}
        >
          {hoveredDoc.content}
        </div>
      )}
    </div>
  )
}

// ─── ProductModal 子组件 ─────────────────────────────────────

interface ProductModalProps {
  mode: 'add' | 'edit'
  initialProduct?: Product
  allDocuments: Record<string, string>
  onSave: (product: Product | Omit<Product, 'id'>) => void
  onClose: () => void
}

function ProductModal({
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

  const handleSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault()
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
    } else {
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
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <h3 style={{ margin: '0 0 var(--space-4) 0' }}>{isEdit ? '编辑产品' : '新增产品'}</h3>
        <form onSubmit={handleSubmit}>
          {/* 标题 */}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* 描述 */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500
              }}
            >
              描述
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="textarea-field"
            />
          </div>

          {/* 编辑模式：只读展示图片信息 */}
          {isEdit && initialProduct && initialProduct.images.length > 0 && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-1)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500
                }}
              >
                图片列表
              </label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {initialProduct.images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`图片${i + 1}`}
                    referrerPolicy="no-referrer"
                    style={{
                      width: 50,
                      height: 50,
                      objectFit: 'cover',
                      borderRadius: 4,
                      border: '1px solid var(--border-default)',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(url, '_blank')}
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 编辑模式：只读展示主图 */}
          {isEdit && initialProduct?.mainImageUrl && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-1)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500
                }}
              >
                主图
              </label>
              <img
                src={initialProduct.mainImageUrl}
                alt="主图"
                referrerPolicy="no-referrer"
                style={{
                  width: 50,
                  height: 50,
                  objectFit: 'cover',
                  borderRadius: 4,
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer'
                }}
                onClick={() => window.open(initialProduct.mainImageUrl, '_blank')}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}

          {/* 关联文档 */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500
              }}
            >
              关联文档
            </label>
            {Object.keys(allDocuments).length === 0 ? (
              <div
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                暂无文档
              </div>
            ) : (
              <TagSelect
                options={Object.keys(allDocuments).map((key) => ({ key, label: key }))}
                selectedKeys={selectedDocs}
                onChange={setSelectedDocs}
                placeholder="搜索并选择关联文档..."
              />
            )}
          </div>

          {/* 自动发货 */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)'
              }}
            >
              <input
                type="checkbox"
                checked={autoDeliver}
                onChange={(e) => setAutoDeliver(e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>自动发货</span>
            </label>
            {autoDeliver && (
              <div style={{ marginTop: 'var(--space-2)' }}>
                <textarea
                  value={autoDeliverContent}
                  onChange={(e) => setAutoDeliverContent(e.target.value)}
                  rows={3}
                  className="textarea-field"
                  placeholder="支付成功后自动发送给买家的内容"
                />
              </div>
            )}
          </div>

          {/* 操作按钮 */}
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
