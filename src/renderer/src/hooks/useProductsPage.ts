import { useCallback, useEffect, useState } from 'react'
import type { Product } from '@shared/types'
import { useToast } from '../contexts/ToastContext'

/** 产品表格行：附带关联文档标题列表。 */
export interface ProductRow extends Product {
  _documentTitles: string[]
}

/** 文档预览浮层状态。 */
export interface DocumentTooltipState {
  content: string
  x: number
  y: number
}

/**
 * 将产品数据映射为表格所需的行数据，并过滤掉不存在的文档引用。
 */
export function buildProductRows(
  products: Product[],
  allDocuments: Record<string, string>
): ProductRow[] {
  return products.map((product) => ({
    ...product,
    _documentTitles: (product.documentKeys ?? []).filter((key) => key in allDocuments)
  }))
}

/**
 * 管理产品页的数据加载、增删改和浮层状态。
 */
export function useProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [allDocuments, setAllDocuments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [hoveredDoc, setHoveredDoc] = useState<DocumentTooltipState | null>(null)
  const { showToast } = useToast()

  /**
   * 同步加载产品列表和文档映射，并生成表格行数据。
   */
  const loadProducts = useCallback(async () => {
    try {
      const [productList, documentMap] = await Promise.all([
        window.electron.product.list(),
        window.electron.document.all()
      ])
      setAllDocuments(documentMap)
      setProducts(buildProductRows(productList, documentMap))
    } catch (error) {
      showToast('error', `加载产品失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  /**
   * 新增产品并在成功后刷新列表。
   */
  const handleAdd = useCallback(
    async (product: Omit<Product, 'id'>) => {
      try {
        await window.electron.product.upsert({ id: Date.now().toString(), ...product })
        showToast('success', '添加成功')
        setShowAddModal(false)
        await loadProducts()
      } catch (error) {
        showToast('error', `添加失败: ${error}`)
      }
    },
    [loadProducts, showToast]
  )

  /**
   * 保存产品修改并在成功后刷新列表。
   */
  const handleEdit = useCallback(
    async (product: Product) => {
      try {
        await window.electron.product.upsert(product)
        showToast('success', '保存成功')
        setEditProduct(null)
        await loadProducts()
      } catch (error) {
        showToast('error', `保存失败: ${error}`)
      }
    },
    [loadProducts, showToast]
  )

  /**
   * 删除指定产品并在成功后刷新列表。
   */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await window.electron.product.deleteById(id)
        showToast('success', '删除成功')
        setDeleteConfirm(null)
        await loadProducts()
      } catch (error) {
        showToast('error', `删除失败: ${error}`)
      }
    },
    [loadProducts, showToast]
  )

  /**
   * 更新文档 tooltip 显示状态。
   */
  const showDocumentTooltip = useCallback((tooltip: DocumentTooltipState) => {
    setHoveredDoc(tooltip)
  }, [])

  /**
   * 隐藏文档 tooltip。
   */
  const hideDocumentTooltip = useCallback(() => {
    setHoveredDoc(null)
  }, [])

  return {
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
    loadProducts,
    handleAdd,
    handleEdit,
    handleDelete,
    showDocumentTooltip,
    hideDocumentTooltip
  }
}
