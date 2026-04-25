/**
 * 可旋转的 Chevron 箭头图标，常用于手风琴/折叠面板的展开指示。
 */
export function ChevronIcon({
  expanded,
  size = 16
}: {
  expanded: boolean
  size?: number
}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 200ms ease-in-out',
        color: 'var(--text-secondary)'
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
