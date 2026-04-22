import { DeleteDocumentDialog } from '../components/documents/DeleteDocumentDialog'
import { DocumentModal } from '../components/documents/DocumentModal'
import { DocumentsTable } from '../components/documents/DocumentsTable'
import { useDocumentsPage } from '../hooks/useDocumentsPage'
import './styles/documents-page.css'

/**
 * 文档管理页面入口，负责文档表格和弹窗装配。
 */
export function DocumentsPage(): React.JSX.Element {
  const {
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
  } = useDocumentsPage()

  if (loading) {
    return <div className="center-state">加载中...</div>
  }

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <div className="page-toolbar__title">
          <h2 className="h1">文档库</h2>
          <p className="page-toolbar__description">维护商品可引用的说明文档与知识片段。</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          新增文档
        </button>
      </div>

      <DocumentsTable
        entries={entries}
        onEdit={setEditKey}
        onDeleteRequest={setDeleteConfirm}
      />

      {showAddModal && (
        <DocumentModal
          title="新增文档"
          initialKey=""
          initialContent=""
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editKey !== null && (
        <DocumentModal
          title="编辑文档"
          initialKey={editKey}
          initialContent={documents[editKey] ?? ''}
          onSave={handleEdit}
          onClose={() => setEditKey(null)}
        />
      )}

      <DeleteDocumentDialog
        documentKey={deleteConfirm}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
