/**
 * 共享类型定义
 *
 * 跨进程（main / renderer / preload / injected）共用的类型统一在此定义。
 * 各模块从此单一来源导入，避免重复定义导致类型不一致。
 *
 * 重要类型：
 * - InjectedElectronAPI: 注入脚本（浏览器环境）专用，由 preload-browser.ts 注入
 *   定义于 "I. 注入脚本 Electron API" 区域
 * - RendererElectronAPI: 渲染进程（React SPA）专用，由 preload/index.ts 注入
 *   定义于 src/preload/index.d.ts
 */

/** 发送消息的结果 */
export interface SendMessageResult {
  success: boolean
  error?: string
}

/** 应用配置 */
export interface AppConfig {
  model: string
  baseURL: string
  apiKey: string
  humanTakeoverKeywords: string
  browserUrl: string
  safetyFilterBlockedKeywords: string[]
  safetyFilterReplacement: string
  /** 订单通知 Webhook URL（支持 <title> 模板变量替换产品名） */
  orderWebhookUrl?: string
}

/** 意图分类配置 */
export interface IntentRouterConfig {
  keywordMap: Record<string, string[]>
  fallbackCategories: string[]
}

// ============================================================
// C. IPC 通信类型族 — 跨进程消息传递的数据结构
// ============================================================

/** 商品卡片信息 */
export interface CardInfo {
  title: string
  price: string
  href: string
}

/** 支付卡片信息 */
export interface PaymentInfo {
  /** 卡片标题，如 "我已付款，等待你发货" */
  title: string
  /** 卡片描述，如 "请包装好商品..." */
  description: string
}

/** 闲鱼聊天消息（DOM 层面的消息结构） */
export interface ChatMessage {
  type: 'text' | 'image' | 'card'
  sender: string
  isSelf: boolean
  content?: string
  cardInfo?: CardInfo
  imageUrl?: string
  paymentInfo?: PaymentInfo
}

/** 聊天会话信息 */
export interface ChatInfo {
  userName: string
  itemId: string
  isMyProduct: boolean
}

/** 对话数据模型 */
export interface Conversation {
  chatInfo: ChatInfo
  messages: ChatMessage[]
}

// ============================================================
// F. 产品类型族 — 闲鱼售卖项目信息
// ============================================================

/** 产品信息 */
export interface Product {
  /** 产品 ID（唯一标识） */
  id: string
  /** 产品标题 */
  title: string
  /** 产品描述（可选） */
  content?: string
  /** 价格策略/价格描述（可选） */
  priceStrategy?: string
  /** 库存数量（可选） */
  stock?: number
  /** 价格字符串（可选，如 "¥8.8 - ¥35.6"） */
  price?: string
  /** 商品图片 URLs */
  images: string[]
  /** 主图 URL，取自 images[0] */
  mainImageUrl: string
  /** 关联的文档 key 列表（仅引用标题，不存实际内容） */
  documentKeys: string[]
  /** 是否启用自动发货 */
  autoDeliver?: boolean
  /** 自动发货内容（固定文本） */
  autoDeliverContent?: string
  /** 动态扩展属性 */
  [key: string]: string | number | string[] | undefined | boolean
}

// ============================================================
// G. 提示词类型
// ============================================================

/** Agent 类型键名，对应 5 个 agent 类型 */
export type AgentKey = 'system' | 'classify' | 'default' | 'price' | 'tech'

/** 单个 Agent 配置 */
export interface AgentConfig {
  temperature: number
  maxTokens: number
  prompt: string
}

// ============================================================
// H. IPC 统一响应类型
// ============================================================

/** IPC 统一响应格式 */
export interface IpcResult<T = unknown> {
  /** 0 = 成功，非 0 = 错误编号 */
  code: number
  /** 错误信息或成功描述 */
  message: string
  /** 实际数据 */
  data: T
}

/** 注入页面的 IPC bridge（低层，仅 send/invoke） */
export interface ElectronIPC {
  send: (channel: string, data: unknown) => void
  invoke: (channel: string, data?: unknown) => Promise<unknown>
}

// ============================================================
// I. 注入脚本 Electron API — 注入脚本（浏览器环境）专用
// 真实来源：src/preload/preload-browser.ts contextBridge.exposeInMainWorld('electronAPI', ...)
// 使用方：src/injected/ 下的所有注入脚本（im-helpers、message-handler 等）
// ============================================================

/**
 * 注入脚本可调用的 IPC API（高层封装）
 *
 * 对应 window.electronAPI，由 preload-browser.ts 通过 contextBridge 注入。
 * 所有注入脚本必须从本文件导入此类型，不得在其他文件中重复声明。
 */
export interface InjectedElectronAPI {
  // ─── 模拟操作 ───────────────────────────────────────────
  simulateClick: (
    x: number,
    y: number
  ) => Promise<{ code: number; message: string; data: { success: boolean } | null }>
  simulateChineseInput: (
    text: string
  ) => Promise<{ code: number; message: string; data: { success: boolean } | null }>
  simulateEnterKey: (
    x: number,
    y: number
  ) => Promise<{ code: number; message: string; data: { success: boolean } | null }>

  // ─── 回复队列 ───────────────────────────────────────────
  replyQueue: {
    dequeue: () => Promise<IpcResult<{ chatId: string | null; replyText: string | null }>>
  }

  // ─── 对话操作 ───────────────────────────────────────────
  conversation: {
    upsert: (
      chatInfo: { userName: string; itemId: string | null; isMyProduct: boolean },
      messages: unknown[]
    ) => Promise<IpcResult<Conversation>>
    getById: (chatId: string) => Promise<IpcResult<Conversation | null>>
  }

  // ─── 商品操作 ───────────────────────────────────────────
  product: {
    upsert: (product: Product) => Promise<IpcResult<Product>>
    list: () => Promise<IpcResult<Product[]>>
  }
}

// ============================================================
// J. 注入脚本全局命令接口 — 主进程通过 executeJavaScript 调用
// ============================================================

/** 主进程推送指令到注入脚本的命令接口 */
export interface RobotCommands {
  sendReply(
    chatId: string,
    replyText: string
  ): Promise<{
    success: boolean
    reason?: string
    state?: string
  }>
  getStatus(): { state: string; lastActivity: number }
}
