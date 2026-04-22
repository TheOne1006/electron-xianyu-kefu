import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../contexts/ToastContext'

/**
 * 文档管理页面的数据与 UI 状态。
 */
export function useDocumentsPage() {
  const [documents, setDocuments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { showToast } = useToast()

  /**
   * 重新加载文档列表。
   */
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
    void loadDocuments()
  }, [loadDocuments])

  /**
   * 新增文档并在成功后刷新列表。
   */
  const handleAdd = useCallback(
    async (key: string, content: string) => {
      try {
        await window.electron.document.upsert(key, content)
        showToast('success', '添加成功')
        setShowAddModal(false)
        await loadDocuments()
      } catch (error) {
        showToast('error', `添加失败: ${error}`)
      }
    },
    [loadDocuments, showToast]
  )

  /**
   * 保存文档内容并在成功后刷新列表。
   */
  const handleEdit = useCallback(
    async (key: string, content: string) => {
      try {
        await window.electron.document.upsert(key, content)
        showToast('success', '保存成功')
        setEditKey(null)
        await loadDocuments()
      } catch (error) {
        showToast('error', `保存失败: ${error}`)
      }
    },
    [loadDocuments, showToast]
  )

  /**
   * 删除文档并在成功后刷新列表。
   */
  const handleDelete = useCallback(
    async (key: string) => {
      try {
        await window.electron.document.delete(key)
        showToast('success', '删除成功')
        setDeleteConfirm(null)
        await loadDocuments()
      } catch (error) {
        showToast('error', `删除失败: ${error}`)
      }
    },
    [loadDocuments, showToast]
  )

  /**
   * 表格渲染用的文档条目列表。
   */
  const entries = useMemo(() => Object.entries(documents), [documents])

  return {
    documents,
    entries,
    loading,
    showAddModal,
    editKey,
    deleteConfirm,
    setShowAddModal,
    setEditKey,
    setDeleteConfirm,
    handleAdd,
    handleEdit,
    handleDelete
  }
}
