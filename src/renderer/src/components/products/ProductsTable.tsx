import { useState } from 'react'
import type { Product } from '@shared/types'
import type { DocumentTooltipState, ProductRow } from '../../hooks/useProductsPage'

interface ProductsTableProps {
  products: ProductRow[]
  allDocuments: Record<string, string>
  onEdit: (product: Product) => void
  onDeleteRequest: (id: string) => void
  onDocumentHover: (tooltip: DocumentTooltipState) => void
  onDocumentLeave: () => void
}

interface ProductImageProps {
  title: string
  imageUrl: string
}

/**
 * 渲染产品主图预览，并在图片加载失败时展示占位文本。
 */
function ProductImagePreview({ title, imageUrl }: ProductImageProps): React.JSX.Element {
  const [loadFailed, setLoadFailed] = useState(false)

  if (!imageUrl || loadFailed) {
    return <span className="products-page__image-placeholder">-</span>
  }

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noreferrer"
      className="products-page__image-link"
      title={title}
    >
      <img
        src={imageUrl}
        alt={title}
        referrerPolicy="no-referrer"
        className="products-page__image"
        onError={() => setLoadFailed(true)}
      />
    </a>
  )
}

/**
 * 渲染产品管理表格与行级操作。
 */
export function ProductsTable({
  products,
  allDocuments,
  onEdit,
  onDeleteRequest,
  onDocumentHover,
  onDocumentLeave
}: ProductsTableProps): React.JSX.Element {
  if (products.length === 0) {
    return <div className="empty-state">暂无产品</div>
  }

  return (
    <div className="table-wrap">
      <table className="data-table products-page__table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>主图</th>
            <th>文档</th>
            <th className="products-page__status">自动发货</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td className="mono-text">{product.id}</td>
              <td className="products-page__title-cell">
                <div className="products-page__title-text" title={product.title}>
                  {product.title}
                </div>
              </td>
              <td>
                <ProductImagePreview title={product.title} imageUrl={product.mainImageUrl} />
              </td>
              <td>
                {product._documentTitles.length > 0 ? (
                  <div className="products-page__document-list">
                    {product._documentTitles.map((docTitle) => {
                      const content = allDocuments[docTitle] ?? ''
                      return (
                        <span
                          key={docTitle}
                          className="products-page__document-tag"
                          onMouseEnter={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect()
                            onDocumentHover({
                              content,
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            })
                          }}
                          onMouseLeave={onDocumentLeave}
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
              <td className="products-page__status">
                {product.autoDeliver ? (
                  <span className="badge badge-success">已启用</span>
                ) : (
                  <span className="products-page__image-placeholder">-</span>
                )}
              </td>
              <td className="products-page__actions">
                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(product)}>
                  编辑
                </button>
                <button
                  className="btn btn-secondary btn-sm text-danger"
                  onClick={() => onDeleteRequest(product.id)}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
