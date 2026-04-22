import type { DocumentTooltipState } from '../../hooks/useProductsPage'

interface DocumentTooltipProps {
  tooltip: DocumentTooltipState | null
}

/**
 * 文档内容悬浮预览。
 */
export function DocumentTooltip({ tooltip }: DocumentTooltipProps): React.JSX.Element | null {
  if (!tooltip) return null

  return (
    <div
      className="products-page__tooltip"
      style={{
        left: tooltip.x,
        top: tooltip.y - 8,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {tooltip.content}
    </div>
  )
}
