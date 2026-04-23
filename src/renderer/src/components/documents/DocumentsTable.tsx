interface DocumentsTableProps {
  entries: Array<[string, string]>
  onEdit: (key: string) => void
  onDeleteRequest: (key: string) => void
}

/**
 * 渲染文档列表表格和行级操作。
 */
export function DocumentsTable({
  entries,
  onEdit,
  onDeleteRequest
}: DocumentsTableProps): React.JSX.Element {
  if (entries.length === 0) {
    return <div className="empty-state">暂无文档</div>
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>内容预览</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, content]) => (
            <tr key={key}>
              <td>{key}</td>
              <td className="documents-page__preview" title={content}>
                {content}
              </td>
              <td className="documents-page__actions">
                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(key)}>
                  编辑
                </button>
                <button
                  className="btn btn-secondary btn-sm text-danger"
                  onClick={() => onDeleteRequest(key)}
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
