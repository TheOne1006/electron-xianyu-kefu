import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mockApp, mockIpcMain, mockWebContents } from './__mocks__/electron'

// 覆盖 setup.ts 的 electron mock，使用普通函数以支持 new 调用
const mockBrowserWindowInstance: Record<string, unknown> = {
  on: vi.fn(),
  show: vi.fn(),
  loadURL: vi.fn(),
  webContents: mockWebContents,
  isDestroyed: vi.fn().mockReturnValue(false)
}

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(function () {
    return mockBrowserWindowInstance
  }),
  app: mockApp,
  ipcMain: mockIpcMain,
  ipcRenderer: {},
  dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
  shell: { openExternal: vi.fn() }
}))

import { createXYBrowserWindow, getBrowserWindow, sendToBrowser } from '../browser'
import type { AppConfig } from '../../shared/types'

const defaultConfig: AppConfig = {
  model: 'test-model',
  baseURL: 'https://api.test.com/v1',
  apiKey: 'test-key',
  language: 'zh-CN',
  humanTakeoverKeywords: '',
  browserUrl: 'https://goofish.com',
  safetyFilterBlockedKeywords: ['微信', 'QQ'],
  safetyFilterReplacement: '**'
}

beforeEach(() => {
  // 重置 mock 状态
  ;(mockBrowserWindowInstance.loadURL as ReturnType<typeof vi.fn>).mockReset()
  ;(mockBrowserWindowInstance.on as ReturnType<typeof vi.fn>).mockReset()
  mockWebContents.send.mockReset()
  mockWebContents.send.mockReturnValue(undefined)
  mockWebContents.setWindowOpenHandler.mockReset()
  // 重置 isDestroyed 为默认 false
  mockBrowserWindowInstance.isDestroyed = vi.fn().mockReturnValue(false)
})

describe('createXYBrowserWindow', () => {
  it('加载配置中的 browserUrl', () => {
    createXYBrowserWindow(defaultConfig)
    expect(mockBrowserWindowInstance.loadURL).toHaveBeenCalledWith('https://goofish.com')
  })

  it('URL 缺少协议时自动补全 https://', () => {
    const config = { ...defaultConfig, browserUrl: 'goofish.com' }
    createXYBrowserWindow(config)
    expect(mockBrowserWindowInstance.loadURL).toHaveBeenCalledWith('https://goofish.com')
  })

  it('browserUrl 为空时使用默认值', () => {
    const config = { ...defaultConfig, browserUrl: '' }
    createXYBrowserWindow(config)
    expect(mockBrowserWindowInstance.loadURL).toHaveBeenCalledWith('https://goofish.com')
  })

  it('自定义 URL 正确加载', () => {
    const config = { ...defaultConfig, browserUrl: 'https://custom.example.com' }
    createXYBrowserWindow(config)
    expect(mockBrowserWindowInstance.loadURL).toHaveBeenCalledWith('https://custom.example.com')
  })
})

describe('getBrowserWindow', () => {
  it('创建窗口后返回实例', () => {
    createXYBrowserWindow(defaultConfig)
    const win = getBrowserWindow()
    expect(win).toBeDefined()
    expect(win).not.toBeNull()
  })
})

describe('sendToBrowser', () => {
  it('窗口存在且未销毁时通过 webContents.send 发送消息', () => {
    createXYBrowserWindow(defaultConfig)
    // mock isDestroyed 返回 false（默认行为）
    sendToBrowser('test-channel', { data: 'hello' })
    expect(mockWebContents.send).toHaveBeenCalledWith('test-channel', { data: 'hello' })
  })

  it('窗口已销毁时不发送消息', () => {
    createXYBrowserWindow(defaultConfig)
    // 模拟窗口已销毁
    mockBrowserWindowInstance.isDestroyed = () => true
    mockWebContents.send.mockClear()

    sendToBrowser('test-channel', {})
    expect(mockWebContents.send).not.toHaveBeenCalled()
  })
})
