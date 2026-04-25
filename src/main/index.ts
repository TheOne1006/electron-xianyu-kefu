import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { consola } from 'consola'
import { createWindow, setMainWindow, closeXYBrowserWindow } from './browser'
import { registerIpcHandlers } from './ipc-handlers'
import { logCollector } from './log'

// 在模块加载时就配置 consola reporter，确保所有 logger 都能继承
// 这样 withTag() 创建的实例也能继承这个 reporter
consola.addReporter({
  log: (logObj) => logCollector.report(logObj)
})

// 创建主窗口 (Main Window)，用于承载 renderer (渲染进程) 的 React 界面
function createMainWindow(): void {
  const mainWindow = createWindow({
    width: 900,
    height: 670,
    title: '闲鱼客服自动回复助手',
    icon: join(__dirname, '../../build/icon.png'),
    // 注入预加载脚本 (Preload Script)，用于桥接主进程和渲染进程
    preload: join(__dirname, '../preload/index.mjs'),
    onWindowOpen: (_win, url) => {
      // 使用系统默认浏览器打开外部链接
      shell.openExternal(url)
    }
  })

  // 基于 electron-vite CLI 的 HMR (热模块替换)
  // 在 dev (开发环境) 加载远程 URL，在 production (生产环境) 加载本地 renderer/index.html 文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 保存主窗口引用，用于向渲染进程发送消息
  setMainWindow(mainWindow)

  // 将主窗口引用传递给 LogCollector，用于向前端推送日志
  logCollector.setWindow(mainWindow)

  // 主窗口关闭时联动关闭闲鱼浏览器窗口
  mainWindow.on('close', () => {
    closeXYBrowserWindow()
  })
}

// 当 Electron 完成初始化 (initialization) 并准备好创建浏览器窗口时，将调用此方法。
// 部分 API 只能在此事件发生后使用。
app.whenReady().then(() => {
  // 设置 Windows 系统的 App User Model ID (应用程序用户模型 ID)
  electronApp.setAppUserModelId('com.electron')

  // macOS 下如果在开发环境，手动设置 Dock 图标
  if (process.platform === 'darwin' && is.dev) {
    app.dock?.setIcon(join(__dirname, '../../build/icon.png'))
  }

  // 在开发环境中默认通过 F12 打开或关闭 DevTools (开发者工具)，
  // 并在生产环境中忽略 CommandOrControl + R (刷新快捷键)。
  // 详见: https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册所有 IPC 通道处理器
  registerIpcHandlers()

  createMainWindow()

  app.on('activate', function () {
    // 在 macOS 系统上，当单击 dock 图标且没有其他窗口打开时，
    // 通常会在应用程序中重新创建一个窗口 (re-create a window)。
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// 当所有窗口都关闭时退出应用 (Quit)，除了 macOS 系统。
// 在 macOS 上，应用程序及其菜单栏通常保持 active (活动) 状态，直到用户使用 Cmd + Q 显式退出。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
