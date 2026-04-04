import { ElectronAPI } from '@electron-toolkit/preload'

// 从共享类型重新导出
export type { AppConfig } from '../shared/types'
export type { ChatInfo, ChatMessage, Conversation } from '../shared/types'
export type { SendMessageResult } from '../shared/types'
export type { Product } from '../shared/types'
export type { AgentKey, AgentConfig } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI & {
      config: {
        get: () => Promise<import('../shared/types').AppConfig>
        save: (config: Partial<import('../shared/types').AppConfig>) => Promise<void>
      }
      browser: {
        launch: (config: import('../shared/types').AppConfig) => Promise<void>
      }
      agentConfig: {
        all: () => Promise<
          Record<import('../shared/types').AgentKey, import('../shared/types').AgentConfig>
        >
        getById: (
          key: import('../shared/types').AgentKey
        ) => Promise<import('../shared/types').AgentConfig>
        update: (
          key: import('../shared/types').AgentKey,
          config: import('../shared/types').AgentConfig
        ) => Promise<void>
        upsert: (
          key: import('../shared/types').AgentKey,
          config: import('../shared/types').AgentConfig
        ) => Promise<void>
      }
      conversation: {
        list: () => Promise<import('../shared/types').Conversation[]>
        getById: (chatId: string) => Promise<import('../shared/types').Conversation | null>
        delete: (chatId: string) => Promise<boolean>
        createOrUpdate: (
          data: import('../shared/types').Conversation
        ) => Promise<import('../shared/types').Conversation>
      }
      replyQueue: {
        enqueue: (
          chatId: string,
          content: string
        ) => Promise<import('../shared/types').IpcResult<{ success: boolean }>>
        dequeue: () => Promise<string | null>
      }
      product: {
        list: () => Promise<Product[]>
        getById: (id: string) => Promise<Product | null>
        upsert: (product: Product) => Promise<unknown>
        deleteById: (id: string) => Promise<void>
      }
      document: {
        list: () => Promise<string[]>
        get: (key: string) => Promise<string>
        all: () => Promise<Record<string, string>>
        upsert: (key: string, content: string) => Promise<void>
        delete: (key: string) => Promise<void>
      }
    }
  }
}
