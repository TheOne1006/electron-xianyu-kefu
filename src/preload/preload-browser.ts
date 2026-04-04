/**
 * 浏览器窗口 preload 入口
 *
 * 职责：
 * 1. 注入 electronAPI（让注入脚本能与主进程通信）
 * 2. 注入 injected.bundle.js
 */

import { ipcRenderer, contextBridge } from 'electron'
import { createConsola } from 'consola/browser'
import { loadInjectedCode } from './injected-inject'

const logger = createConsola({ defaults: { tag: 'preload:browser' } })

window.addEventListener('DOMContentLoaded', () => {
  logger.info('DOMContentLoaded, starting injections...')

  contextBridge.exposeInMainWorld('electronAPI', {
    // 模拟鼠标点击
    simulateClick: (x: number, y: number) => ipcRenderer.invoke('simulate:click', x, y),
    // 模拟中文输入
    simulateChineseInput: (text: string) => ipcRenderer.invoke('simulate:chinese-input', text),
    // 模拟 Enter 键发送
    simulateEnterKey: (x: number, y: number) => ipcRenderer.invoke('simulate:enter-key', { x, y }),
    // 回复队列操作
    replyQueue: {
      dequeue: () => ipcRenderer.invoke('reply-queue:dequeue')
    },

    // 对话操作
    conversation: {
      upsert: (
        chatInfo: { userName: string; itemId: string | null; isMyProduct: boolean },
        messages: unknown[]
      ) => ipcRenderer.invoke('conversation:upsert', { chatInfo, messages }),
      getById: (chatId: string) => ipcRenderer.invoke('conversation:getById', { chatId })
    },

    // 商品操作
    product: {
      upsert: (product: unknown) => ipcRenderer.invoke('product:upsert', product),
      list: () => ipcRenderer.invoke('product:list')
    }
  })

  // 注入统一的 injected bundle
  const code = loadInjectedCode()
  const script = document.createElement('script')
  script.textContent = code
  document.head.appendChild(script)

  logger.info('Injection completed')
})
