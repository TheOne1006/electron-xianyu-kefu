/**
 * E2E 测试 Fixture — BrowserWindow 工厂
 *
 * 创建真实的 Electron BrowserWindow 加载 mock-xianyu HTML，
 * 注入 harness（拦截 setInterval）+ 编译后的 bundle。
 */
import { BrowserWindow } from 'electron'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_ROOT = process.cwd()
const MOCK_HTML = resolve(PROJECT_ROOT, 'tests/mock-xianyu/im.html')
const BUNDLE_PATH = resolve(PROJECT_ROOT, 'resources/injected.bundle.js')
const HARNESS_PATH = resolve(PROJECT_ROOT, 'tests/e2e/harness/im-robot-harness.js')

export interface CallLogEntry {
  api: string
  method: string
  args: unknown[]
  result: unknown
  timestamp: number
}

export interface MockIMPage {
  win: BrowserWindow
  evaluate: <T>(js: string) => Promise<T>
  getCallLog: () => Promise<CallLogEntry[]>
  clearCallLog: () => Promise<void>
  triggerTick: () => Promise<void>
  cleanup: () => void
}

/**
 * 创建 mock IM 页面并注入 bundle
 *
 * 执行顺序：
 * 1. loadFile(mock-xianyu/im.html) — 加载 mock 页面
 * 2. history.pushState('/im') — 设置路由
 * 3. 注入 harness — 拦截 setInterval
 * 4. 注入 bundle — ImRobot 启动（500ms tick）
 */
export async function createMockIMPage(): Promise<MockIMPage> {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: {
      sandbox: false
    }
  })

  await win.loadFile(MOCK_HTML)

  const evaluate = async <T>(js: string): Promise<T> => {
    return win.webContents.executeJavaScript(js) as Promise<T>
  }

  // 设置路由 + 注入 harness（拦截 setInterval）+ 注入 bundle
  await evaluate(`history.pushState({}, '', '/im')`)

  const harnessCode = readFileSync(HARNESS_PATH, 'utf-8')
  await evaluate(harnessCode)

  const bundleCode = readFileSync(BUNDLE_PATH, 'utf-8')
  await evaluate(bundleCode)

  // 等待 ImRobot 初始化完成（加载产品列表）
  await new Promise((r) => setTimeout(r, 500))

  const getCallLog = async (): Promise<CallLogEntry[]> => {
    return evaluate<CallLogEntry[]>('window.__mockCallLog || []')
  }

  const clearCallLog = async (): Promise<void> => {
    await evaluate('if (window.__mockCallLog) { window.__mockCallLog.length = 0 }')
  }

  const triggerTick = async (): Promise<void> => {
    await evaluate('window.__testRobot.triggerTick()')
  }

  const cleanup = (): void => {
    if (!win.isDestroyed()) {
      win.close()
    }
  }

  return {
    win,
    evaluate,
    getCallLog,
    clearCallLog,
    triggerTick,
    cleanup
  }
}

/** 等待 callLog 中出现指定 API 调用 */
export async function waitForCall(
  page: MockIMPage,
  api: string,
  method: string,
  timeout = 5000
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const log = await page.getCallLog()
    const found = log.some((entry) => entry.api === api && entry.method === method)
    if (found) return
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`Timeout waiting for call: ${api}.${method}`)
}

/** 等待 callLog 满足自定义条件 */
export async function waitForCallCondition(
  page: MockIMPage,
  condition: (log: CallLogEntry[]) => boolean,
  timeout = 5000
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const log = await page.getCallLog()
    if (condition(log)) return
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('Timeout waiting for callLog condition')
}
