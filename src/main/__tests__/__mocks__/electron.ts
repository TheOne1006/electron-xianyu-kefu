import { vi, type Mock } from 'vitest'

export const mockWebContents: Record<string, Mock> = {
  on: vi.fn(),
  openDevTools: vi.fn(),
  loadURL: vi.fn(),
  setWindowOpenHandler: vi.fn(),
  send: vi.fn(),
  sendInputEvent: vi.fn(),
  insertText: vi.fn()
}

export const mockBrowserWindowInstance: Record<string, unknown> = {
  on: vi.fn(),
  show: vi.fn(),
  loadURL: vi.fn(),
  webContents: mockWebContents,
  isDestroyed: vi.fn().mockReturnValue(false)
}

export const mockApp: Record<string, unknown> = {
  getPath: vi.fn((name: string) => {
    if (name === 'userData') return '/fake/userData'
    return `/fake/${name}`
  }),
  on: vi.fn(),
  whenReady: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn(),
  getName: vi.fn(() => 'test-app'),
  getVersion: vi.fn(() => '1.0.0')
}

export const mockIpcMain: Record<string, Mock> = {
  on: vi.fn(),
  handle: vi.fn(),
  removeHandler: vi.fn()
}

export function resetElectronMocks(): void {
  ;(mockBrowserWindowInstance.on as Mock).mockReset()
  ;(mockBrowserWindowInstance.show as Mock).mockReset()
  ;(mockBrowserWindowInstance.loadURL as Mock).mockReset()
  mockWebContents.on.mockReset()
  mockWebContents.openDevTools.mockReset()
  mockWebContents.loadURL.mockReset()
  mockWebContents.setWindowOpenHandler.mockReset()
  mockWebContents.send.mockReset()
  mockWebContents.send.mockReturnValue(undefined)
  mockWebContents.sendInputEvent.mockReset()
  mockWebContents.sendInputEvent.mockReturnValue(undefined)
  mockWebContents.insertText.mockReset()
  mockIpcMain.on.mockReset()
  mockIpcMain.handle.mockReset()
  ;(mockApp.getPath as Mock).mockReset()
  ;(mockApp.getPath as Mock).mockImplementation((name: string) => {
    if (name === 'userData') return '/fake/userData'
    return `/fake/${name}`
  })
}
