import { useState } from 'react'

interface QAItem {
  question: string
  answer: string
}

const qaList: QAItem[] = [
  {
    question: '这个应用是做什么的？',
    answer:
      '闲鱼 AI 自动客服。它能在闲鱼网页上自动检测买家消息，用 AI 生成回复并发送，实现 24 小时自动回复。支持价格谈判、技术咨询、常规问答等多种场景。'
  },
  {
    question: '我需要配置什么才能开始使用？',
    answer:
      '只需要两步：1) 在设置页面配置 AI 模型的 API 地址和密钥；2) 在闲鱼浏览器中收集你的商品信息。完成后系统即可开始自动回复。'
  },
  {
    question: '支持哪些 AI 模型？',
    answer:
      '支持所有 OpenAI 兼容的 API 接口。默认使用 MiniMax-M2.7 模型，你也可以切换到 DeepSeek、通义千问、ChatGPT 等任何兼容接口。只需在设置页面填入对应的 API 地址和密钥。'
  },
  {
    question: 'Agent 是什么？有哪几种？',
    answer:
      'Agent 是专门处理某一类任务的 AI 助手。系统有 5 种 Agent：\n\n• 系统 Agent — 定义 AI 的角色和行为规范\n• 分类 Agent — 判断买家消息的意图类型\n• 默认 Agent — 处理常规问候和闲聊\n• 价格 Agent — 专门处理价格谈判和优惠讨论\n• 技术 Agent — 回答产品相关的技术问题\n\n每个 Agent 的提示词都可以在 Agent 配置页面自定义。'
  },
  {
    question: '如何收集闲鱼商品信息？',
    answer:
      '打开浏览器后，进入你的宝贝详情页，页面右下角会出现蓝色的收集产品按钮，点击即可自动采集商品信息（标题、图片、描述、价格等）。采集后返回产品页面即可查看。'
  },
  {
    question: '自动回复是怎么工作的？',
    answer:
      '系统每 10 秒检查一次闲鱼页面的新消息。发现未读消息后，会提取聊天内容发送给 AI。AI 根据商品信息和对话历史生成回复，然后模拟人工操作将回复发送出去。整个过程全自动，无需人工干预。'
  },
  {
    question: '系统多久检查一次新消息？',
    answer:
      '系统每 10 秒自动检查一次。检查顺序是：优先发送队列中已有的回复，然后再查看是否有新消息。这样确保回复不会堆积。'
  },
  {
    question: '如何让 AI 人工接管对话？',
    answer:
      '当买家发送「。」（句号，可在设置中自定义）时，系统会进入人工接管模式，停止自动回复。你也可以点击浏览器页面上的停止按钮来暂停自动回复。'
  },
  {
    question: '安全过滤是做什么的？',
    answer:
      '安全过滤会检查 AI 生成的回复内容，自动替换其中的敏感关键词。比如如果 AI 回复中包含不当内容，系统会用安全文本替换后再发送。关键词列表可在设置页面自定义。'
  },
  {
    question: '对话历史保存在哪里？',
    answer:
      '所有对话历史保存在本地（JSON 文件），不会上传到任何服务器。你可以在对话页面查看完整的历史记录。'
  },
  {
    question: '如何修改 AI 的回复风格？',
    answer:
      '进入 Agent 配置页面，选择要修改的 Agent，编辑其提示词（Prompt）。提示词决定了 AI 的角色、语气和回复策略。修改后立即生效，不需要重启应用。'
  },
  {
    question: '产品信息对自动回复有什么影响？',
    answer:
      'AI 在生成回复时会参考关联的商品信息（标题、描述、价格策略等）。如果商品信息完整，AI 能更准确地回答关于产品的问题和进行价格谈判。建议为每个在售商品都完成信息采集。'
  }
]

export function QAndAPage(): React.JSX.Element {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const toggleItem = (index: number): void => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

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
          常见问题解答
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {qaList.map((item, index) => {
            const isExpanded = expandedIndex === index
            const isHovered = hoveredIndex === index && !isExpanded
            return (
              <div
                key={index}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: `1px solid ${isExpanded ? 'var(--brand-primary)' : isHovered ? 'var(--border-active)' : 'var(--border-default)'}`,
                  transition: 'border-color 200ms ease-in-out'
                }}
              >
                <button
                  onClick={() => toggleItem(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  aria-expanded={isExpanded}
                  aria-controls={`qa-answer-${index}`}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: isExpanded
                      ? 'var(--bg-elevated)'
                      : isHovered
                        ? 'var(--bg-elevated)'
                        : 'transparent',
                    border: 'none',
                    color: isExpanded ? 'var(--brand-primary)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-body)',
                    fontWeight: isExpanded ? 600 : 400,
                    textAlign: 'left',
                    transition: 'background-color 200ms ease-in-out, color 200ms ease-in-out'
                  }}
                >
                  <span style={{ lineHeight: 'var(--leading-relaxed)' }}>{item.question}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      flexShrink: 0,
                      marginLeft: 'var(--space-3)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms ease-in-out',
                      color: isExpanded ? 'var(--brand-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {/* 回答区域 */}
                <div
                  id={`qa-answer-${index}`}
                  role="region"
                  aria-labelledby={`qa-question-${index}`}
                  style={{
                    maxHeight: isExpanded ? '500px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 250ms ease-in-out'
                  }}
                >
                  <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '2px',
                        backgroundColor: 'var(--brand-primary)',
                        borderRadius: '1px',
                        marginBottom: 'var(--space-3)',
                        opacity: 0.5
                      }}
                    />
                    <p
                      style={{
                        fontSize: 'var(--text-body)',
                        color: 'var(--text-secondary)',
                        lineHeight: 'var(--leading-relaxed)',
                        margin: 0,
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
