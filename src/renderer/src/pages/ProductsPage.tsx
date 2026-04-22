import type { Product } from '@shared/types'
import { DeleteProductDialog } from '../components/products/DeleteProductDialog'
import { DocumentTooltip } from '../components/products/DocumentTooltip'
import { ProductModal } from '../components/products/ProductModal'
import { ProductsTable } from '../components/products/ProductsTable'
import { useProductsPage } from '../hooks/useProductsPage'
import './styles/products-page.css'

/**
 * 产品管理页面入口，负责装配状态与视图组件。
 */
export function ProductsPage(): React.JSX.Element {
  const {
    products,
    allDocuments,
    loading,
    showAddModal,
    editProduct,
    deleteConfirm,
    hoveredDoc,
    setShowAddModal,
    setEditProduct,
    setDeleteConfirm,
    handleAdd,
    handleEdit,
    handleDelete,
    showDocumentTooltip,
    hideDocumentTooltip
  } = useProductsPage()

  if (loading) {
    return <div className="center-state">加载中...</div>
  }

  return (
    <div className="page-shell">
      <div className="page-toolbar products-page__header">
        <div className="page-toolbar__title">
          <h2 className="h1">产品管理</h2>
          <p className="page-toolbar__description">查看采集商品，维护关联文档和自动发货配置。</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          新增产品
        </button>
      </div>

      <ProductsTable
        products={products}
        allDocuments={allDocuments}
        onEdit={setEditProduct}
        onDeleteRequest={setDeleteConfirm}
        onDocumentHover={showDocumentTooltip}
        onDocumentLeave={hideDocumentTooltip}
      />

      {showAddModal && (
        <ProductModal
          mode="add"
          allDocuments={allDocuments}
          onSave={(product) => handleAdd(product as Omit<Product, 'id'>)}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editProduct && (
        <ProductModal
          mode="edit"
          initialProduct={editProduct}
          allDocuments={allDocuments}
          onSave={(product) => handleEdit(product as Product)}
          onClose={() => setEditProduct(null)}
        />
      )}

      <DeleteProductDialog
        productId={deleteConfirm}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm(null)}
      />

      <DocumentTooltip tooltip={hoveredDoc} />
    </div>
  )
}
