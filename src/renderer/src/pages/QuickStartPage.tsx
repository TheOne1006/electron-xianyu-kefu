import { useState } from 'react'
import configsPageImg from '../assets/screenshots/configs-page.png'
import xianyuProductDetailImg from '../assets/screenshots/xianyu-product-detail.png'
import productsPageImg from '../assets/screenshots/products-page.png'
import xianyuChatDetailImg from '../assets/screenshots/xianyu-chat-detail.png'

interface Step {
  number: number
  title: string
  description: string[]
  tip?: string
  images?: { src: string; caption: string }[]
}

const steps: Step[] = [
  {
    number: 1,
    title: '配置模型',
    description: [
      '进入设置页面，填入你的 AI 模型参数：',
      'API 地址、密钥、模型名称',
      '点击「保存设置」完成配置'
    ],
    tip: '支持所有 OpenAI 兼容的 API 接口（DeepSeek、通义千问、ChatGPT 等）',
    images: [{ src: configsPageImg, caption: '设置页面 — 填入模型参数并保存' }]
  },
  {
    number: 2,
    title: '收集产品',
    description: [
      '1. 点击「打开浏览器」按钮',
      '2. 登录闲鱼账号',
      '3. 进入自己的宝贝详情页',
      '4. 点击右下角蓝色收集产品按钮',
      '5. 返回产品页面查看最新数据'
    ],
    tip: '需要先进入商品详情页，右下角才会出现收集按钮',
    images: [
      { src: xianyuProductDetailImg, caption: '宝贝详情页 — 右下角蓝色收集按钮' },
      { src: productsPageImg, caption: '产品页面 — 收集后的产品列表' }
    ]
  },
  {
    number: 3,
    title: '开始监听',
    description: [
      '在浏览器中点击进入任意聊天对话',
      '（右侧消息详情页）',
      '系统自动进入监听模式',
      '收到消息后 AI 将自动生成并发送回复'
    ],
    tip: '发送「。」可触发人工接管模式，暂停自动回复',
    images: [{ src: xianyuChatDetailImg, caption: '聊天详情页 — 进入监听模式' }]
  }
]

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

export function QuickStartPage(): React.JSX.Element {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--space-6) var(--space-4)',
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <div style={{ width: '100%', maxWidth: '680px' }}>
        <h2
          style={{
            fontSize: 'var(--text-h1)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-6)'
          }}
        >
          三步完成配置，开始自动回复
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            const isHovered = hoveredStep === step.number
            return (
              <div key={step.number}>
                {/* 步骤卡片 */}
                <div
                  onMouseEnter={() => setHoveredStep(step.number)}
                  onMouseLeave={() => setHoveredStep(null)}
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
                        backgroundColor: isHovered
                          ? 'var(--brand-primary-hover)'
                          : 'var(--brand-primary)',
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

                  {/* 截图展示 */}
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
                              style={{
                                width: '100%',
                                display: 'block'
                              }}
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

                  {/* 提示信息 — SVG 图标替代 emoji */}
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

                {/* 步骤之间的连接线 */}
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
          })}
        </div>
      </div>
    </div>
  )
}
