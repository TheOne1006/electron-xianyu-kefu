import { vi } from 'vitest'
import { mockApp, mockIpcMain, mockBrowserWindowInstance } from './__mocks__/electron'

// 导入 mocks.ts 以触发其 vi.mock('electron-store') 注册
// mocks.ts 必须在 electron-store 被其他模块导入前完成 mock 注册
import './mock-electron-store'

// Mock electron 模块
vi.mock('electron', () => {
  const BrowserWindowMock = vi.fn(() => mockBrowserWindowInstance)
  // @ts-expect-error - 添加静态方法到 mock
  BrowserWindowMock.fromWebContents = vi.fn(() => mockBrowserWindowInstance)
  return {
    BrowserWindow: BrowserWindowMock,
    app: mockApp,
    ipcMain: mockIpcMain,
    ipcRenderer: {},
    dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
    shell: { openExternal: vi.fn() }
  }
})

// Mock consola（静默日志）
vi.mock('consola', () => ({
  consola: {
    withTag: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      success: vi.fn()
    })),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))
