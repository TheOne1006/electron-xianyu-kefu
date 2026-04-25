import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { createConsola } from 'consola/browser'
import { createIpcLogReporter } from '../shared/log-reporter'

const logger = createConsola({
  defaults: { tag: 'preload:index' },
  reporters: [createIpcLogReporter((ch, data) => ipcRenderer.send(ch, data))]
})

/** IPC 响应解包 helper — 从 IpcResult<T> 中提取 data 字段 */
async function invokeAndUnwrap<T>(channel: string, data?: unknown): Promise<T> {
  const result = await ipcRenderer.invoke(channel, data)
  return (result as { data: T }).data
}

// Custom APIs for renderer, merged with electronAPI
const api = {
  ...electronAPI,
  config: {
    get: () => invokeAndUnwrap('config:get'),
    save: (config: unknown) => ipcRenderer.invoke('config:save', config)
  },
  xyBrowser: {
    launch: (config: unknown) => ipcRenderer.invoke('xy-browser:launch', config),
    close: () => ipcRenderer.invoke('xy-browser:close'),
    getStatus: () => invokeAndUnwrap<boolean>('xy-browser:getStatus'),
    onStatusChange: (callback: (status: 'running' | 'closed') => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: 'running' | 'closed'): void =>
        callback(status)
      ipcRenderer.on('xy-browser:status', handler)
      return () => ipcRenderer.removeListener('xy-browser:status', handler)
    }
  },
  agentConfig: {
    all: () => invokeAndUnwrap('agent-config:all'),
    getById: (key: string) => invokeAndUnwrap('agent-config:getById', { key }),
    update: (key: string, config: unknown) =>
      ipcRenderer.invoke('agent-config:update', { key, config }),
    upsert: (key: string, config: unknown) =>
      ipcRenderer.invoke('agent-config:upsert', { key, config })
  },
  conversation: {
    list: () => invokeAndUnwrap<import('../shared/types').Conversation[]>('conversation:list'),
    getById: (chatId: string) =>
      invokeAndUnwrap<import('../shared/types').Conversation | null>('conversation:getById', {
        chatId
      }),
    delete: (chatId: string) => invokeAndUnwrap<boolean>('conversation:delete', { chatId }),
    createOrUpdate: (data: import('../shared/types').Conversation) =>
      invokeAndUnwrap<import('../shared/types').Conversation>('conversation:createOrUpdate', data)
  },
  replyQueue: {
    dequeue: () => invokeAndUnwrap<string | null>('reply-queue:dequeue'),
    enqueue: (chatId: string, content: string) =>
      ipcRenderer.invoke('reply-queue:enqueue', { chatId, content })
  },
  product: {
    list: () => invokeAndUnwrap('product:list'),
    getById: (id: string) => invokeAndUnwrap('product:getById', { id }),
    upsert: (product: unknown) => ipcRenderer.invoke('product:upsert', product),
    deleteById: (id: string) => ipcRenderer.invoke('product:deleteById', { id })
  },
  document: {
    list: () => invokeAndUnwrap<string[]>('document:list'),
    get: (key: string) => invokeAndUnwrap<string>('document:get', { key }),
    all: () => invokeAndUnwrap<Record<string, string>>('document:all'),
    upsert: (key: string, content: string) =>
      ipcRenderer.invoke('document:upsert', { key, content }),
    delete: (key: string) => ipcRenderer.invoke('document:delete', { key })
  },
  log: {
    request: () => invokeAndUnwrap<import('../shared/types').LogEntry[]>('log:request'),
    clear: () => ipcRenderer.invoke('log:clear'),
    onNew: (callback: (entry: import('../shared/types').LogEntry) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        entry: import('../shared/types').LogEntry
      ): void => callback(entry)
      ipcRenderer.on('log:new', handler)
      return () => ipcRenderer.removeListener('log:new', handler)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api)
  } catch (error) {
    logger.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = api
}
