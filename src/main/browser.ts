import { BrowserWindow } from 'electron'
import { join } from 'path'
import type { AppConfig } from '../shared/types'
import type { WindowConfig } from './types'
import { consola } from 'consola'

const logger = consola.withTag('browser')

/**
 * 通用窗口创建工厂
 * 合并 show/autoHideMenuBar/sandbox/ready-to-show/setWindowOpenHandler 等通用逻辑
 */
export function createWindow(config: WindowConfig): BrowserWindow {
  const bw = new BrowserWindow({
    width: config.width ?? 900,
    height: config.height ?? 670,
    show: false,
    title: config.title,
    icon: config.icon,
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: false,
      preload: config.preload,
      ...(config.webSecurity !== undefined ? { webSecurity: config.webSecurity } : {}),
      ...(config.additionalArguments ? { additionalArguments: config.additionalArguments } : {})
    }
  })

  bw.on('ready-to-show', () => {
    bw.show()
    config.onReadyToShow?.(bw)
  })

  bw.webContents.setWindowOpenHandler(({ url }) => {
    if (config.onWindowOpen) {
      config.onWindowOpen(bw, url)
    }
    return { action: 'deny' }
  })

  return bw
}

/** 模块级变量，持有浏览器窗口实例的引用 */
let browserWindowInstance: BrowserWindow | null = null

/** 模块级变量，持有主窗口实例的引用（React 渲染窗口） */
let mainWindowInstance: BrowserWindow | null = null

/** 获取主窗口实例 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindowInstance
}

/** 设置主窗口实例 */
export function setMainWindow(win: BrowserWindow): void {
  mainWindowInstance = win
}

/** 创建闲鱼浏览器窗口 */
export function createXYBrowserWindow(appConfig: AppConfig): BrowserWindow {
  const bw = createWindow({
    width: 1280,
    height: 800,
    title: '闲鱼客服自动回复助手 - 浏览器',
    icon: join(__dirname, '../../build/icon.png'),
    preload: join(__dirname, '../preload/preload-browser.mjs'),
    webSecurity: false,
    // TODO: [STEP-7] 移除 --page-agent-config 参数（page-agent 已移除）
    // additionalArguments: [`--page-agent-config=${JSON.stringify(appConfig)}`],
    onReadyToShow: (win) => {
      if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools()
      }
    },
    onWindowOpen: (win, url) => {
      win.webContents.loadURL(url)
    }
  })

  let url = appConfig.browserUrl || 'https://goofish.com'
  // URL 格式校验：非空且缺少协议前缀时自动补全
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  if (!url) {
    url = 'https://goofish.com'
  }
  bw.loadURL(url)
  bw.on('close', () => {
    browserWindowInstance = null
    notifyMainWindow('closed')
  })
  notifyMainWindow('running')
  browserWindowInstance = bw
  return bw
}

/** 获取浏览器窗口实例 */
export function getBrowserWindow(): BrowserWindow | null {
  return browserWindowInstance
}

/** 向浏览器窗口发送 IPC 消息 */
export function sendToBrowser(channel: string, data: unknown): void {
  if (browserWindowInstance && !browserWindowInstance.isDestroyed()) {
    browserWindowInstance.webContents.send(channel, data)
  }
}

/** 通知主窗口闲鱼浏览器状态变更 */
function notifyMainWindow(status: 'running' | 'closed'): void {
  const mainWin = getMainWindow()
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('xy-browser:status', status)
  }
}

/** 关闭闲鱼浏览器窗口 */
export function closeXYBrowserWindow(): void {
  if (browserWindowInstance && !browserWindowInstance.isDestroyed()) {
    browserWindowInstance.close()
  }
}

/** 查询闲鱼浏览器窗口是否在运行 */
export function isXYBrowserRunning(): boolean {
  return browserWindowInstance !== null && !browserWindowInstance.isDestroyed()
}

/**
 * 向注入脚本推送回复指令
 *
 * 通过 webContents.executeJavaScript() 调用注入脚本中注册的 __robotCommands.sendReply()。
 * 如果注入脚本忙（返回 success: false），回退到 reply-queue 入队。
 */
export async function pushReplyToInjector(chatId: string, replyText: string): Promise<boolean> {
  const bw = getBrowserWindow()
  if (!bw || bw.isDestroyed()) {
    logger.warn('[推送] 浏览器窗口不存在')
    return false
  }

  try {
    const safeChatId = chatId.replace(/'/g, "\\'")
    const safeReplyText = JSON.stringify(replyText)

    const result = await bw.webContents.executeJavaScript(
      `window.__robotCommands?.sendReply('${safeChatId}', ${safeReplyText})`
    )

    if (result?.success) {
      logger.info(`[推送] 回复已直接推送: ${chatId}`)
      return true
    }

    logger.info(`[推送] 注入脚本忙 (${result?.reason || 'unknown'})，将回退到队列`)
    return false
  } catch (err) {
    logger.warn(`[推送] executeJavaScript 失败: ${err}`)
    return false
  }
}
