import { useState } from 'react'

interface StepImage {
  src: string
  caption: string
}

export interface Step {
  number: number
  title: string
  description: string[]
  tip?: string
  images?: StepImage[]
}

function TipIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: '1px' }}
    >
      <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
      <path d="M9 21h6" />
      <path d="M10 17v4" />
      <path d="M14 17v4" />
    </svg>
  )
}

/**
 * 快速入门步骤卡片，包含步骤编号、描述、截图和提示。
 */
export function StepCard({ step, isLast }: { step: Step; isLast: boolean }): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          border: `1px solid ${isHovered ? 'var(--brand-primary)' : 'var(--border-default)'}`,
          transition: 'box-shadow 200ms ease-in-out, border-color 200ms ease-in-out',
          cursor: 'default'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-3)'
          }}
        >
          <span
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: isHovered ? 'var(--brand-primary-hover)' : 'var(--brand-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-body)',
              fontWeight: 600,
              flexShrink: 0,
              transition: 'background-color 200ms ease-in-out'
            }}
          >
            {step.number}
          </span>
          <span
            style={{
              fontSize: 'var(--text-h2)',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}
          >
            {step.title}
          </span>
        </div>

        <div style={{ paddingLeft: '40px' }}>
          {step.description.map((line, i) => (
            <p
              key={i}
              style={{
                fontSize: 'var(--text-body)',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 'var(--leading-relaxed)'
              }}
            >
              {line}
            </p>
          ))}
        </div>

        {step.images && (
          <div style={{ paddingLeft: '40px', marginTop: 'var(--space-4)' }}>
            {step.images.map((img, i) => (
              <div key={i}>
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    overflow: 'hidden',
                    transition: 'border-color 200ms ease-in-out'
                  }}
                >
                  <img
                    src={img.src}
                    alt={img.caption}
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 'var(--text-caption)',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    marginTop: 'var(--space-2)',
                    marginBottom: i < step.images!.length - 1 ? 'var(--space-4)' : 0
                  }}
                >
                  {img.caption}
                </p>
              </div>
            ))}
          </div>
        )}

        {step.tip && (
          <div
            style={{
              marginTop: 'var(--space-3)',
              marginLeft: '40px',
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-caption)',
              color: 'var(--color-info)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              lineHeight: 'var(--leading-relaxed)'
            }}
          >
            <TipIcon />
            <span>{step.tip}</span>
          </div>
        )}
      </div>

      {!isLast && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 'var(--space-2) 0'
          }}
        >
          <div
            style={{
              width: '1px',
              height: '16px',
              backgroundColor: 'var(--text-disabled)',
              opacity: 0.4
            }}
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-disabled)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M19 12l-7 7-7-7" />
          </svg>
          <div
            style={{
              width: '1px',
              height: '16px',
              backgroundColor: 'var(--text-disabled)',
              opacity: 0.4
            }}
          />
        </div>
      )}
    </div>
  )
}
