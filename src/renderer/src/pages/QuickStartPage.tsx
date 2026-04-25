import { PageCenteredWrapper } from '../components/PageCenteredWrapper'
import { StepCard } from '../components/quick-start/StepCard'
import type { Step } from '../components/quick-start/StepCard'
import configsPageImg from '../assets/screenshots/configs-page.png'
import xianyuProductDetailImg from '../assets/screenshots/xianyu-product-detail.png'
import productsPageImg from '../assets/screenshots/products-page.png'
import xianyuChatDetailImg from '../assets/screenshots/xianyu-chat-detail.png'

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

export function QuickStartPage(): React.JSX.Element {
  return (
    <PageCenteredWrapper>
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
        {steps.map((step, index) => (
          <StepCard key={step.number} step={step} isLast={index === steps.length - 1} />
        ))}
      </div>
    </PageCenteredWrapper>
  )
}
