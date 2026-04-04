import { ipcMain, BrowserWindow } from 'electron'
import { consola } from 'consola'
import { getAppConfig, saveAppConfig } from './stores/app-config-store'
import { createBrowserWindow } from './browser'
import { handleNewUserMessage } from './business/agent'
import { dequeue, enqueue } from './stores/reply-queue'
import { AgentKey, AgentConfig, Conversation, Product, AppConfig } from '../shared/types'
import type { IpcResult } from '../shared/types'

import {
  getById as getConversationById,
  createOrUpdate as createOrUpdateConversation,
  deleteById as deleteConversation,
  list as listConversations,
  appendMessage as appendConversationMessage
} from './stores/conversation-store'

import {
  getAgentConfig,
  getAllAgentConfigs,
  saveAgentConfig,
  upsertAgentConfig
} from './stores/agent-config-store'

import {
  list as listProducts,
  getById as getProduct,
  createOrUpdate as createOrUpdateProduct,
  deleteById as deleteProduct
} from './stores/product-store'

import {
  listDocuments,
  getDocument,
  getAllDocuments,
  upsertDocument,
  deleteDocument
} from './stores/document-store'

const logger = consola.withTag('ipc-handlers')

// ─── IPC 响应 wrapper ─────────────────────────────────────────

/** 成功响应 */
function ok<T>(data: T, message = ''): IpcResult<T> {
  return { code: 0, message, data }
}

/** 失败响应 */
function err(code: number, message: string): IpcResult<null> {
  return { code, message, data: null }
}

// ─── Handler 注册 ─────────────────────────────────────────────

/**
 * 注册所有 IPC 通道处理器
 * 在 app.whenReady() 后调用一次
 */
export function registerIpcHandlers(): void {
  // ─── 测试通道 ─────────────────────────────────────────────
  ipcMain.handle('ping', () => {
    return ok('pong')
  })

  // ─── Config ─────────────────────────────────────────────
  ipcMain.handle('config:get', () => {
    return ok(getAppConfig())
  })

  ipcMain.handle('config:save', (_event, config: Partial<AppConfig>) => {
    saveAppConfig(config)
    return ok(null)
  })

  // ─── Browser / Agent ─────────────────────────────────────
  ipcMain.handle('browser:launch', (_event, config: AppConfig) => {
    createBrowserWindow(config)
    return ok(null)
  })

  ipcMain.handle('conversation:upsert', async (_event, data: Conversation) => {
    try {
      await handleNewUserMessage(data)
      return ok(null)
    } catch (e) {
      logger.error('处理消息失败:', e)
      return err(1003, '处理消息失败')
    }
  })

  ipcMain.handle('reply-queue:dequeue', () => {
    const chatId = dequeue()
    if (chatId !== null) {
      logger.info(`[IPC] 回复队列需要发送给会话: ${chatId}`)
    }
    return ok({ chatId })
  })

  // ─── Agent Config ─────────────────────────────────────
  ipcMain.handle('agent-config:all', () => {
    return ok(getAllAgentConfigs())
  })

  ipcMain.handle('agent-config:getById', (_event, { key }: { key: AgentKey }) => {
    return ok(getAgentConfig(key))
  })

  ipcMain.handle(
    'agent-config:update',
    (_event, { key, config }: { key: AgentKey; config: AgentConfig }) => {
      saveAgentConfig(key, config)
      return ok(null)
    }
  )

  ipcMain.handle(
    'agent-config:upsert',
    (_event, { key, config }: { key: AgentKey; config: AgentConfig }) => {
      upsertAgentConfig(key, config)
      return ok(null)
    }
  )

  // ─── Product ─────────────────────────────────────────────
  ipcMain.handle('product:list', () => {
    return ok(listProducts())
  })

  ipcMain.handle('product:getById', (_event, { id }: { id: string }) => {
    return ok(getProduct(id))
  })

  ipcMain.handle('product:upsert', (_event, product: Product) => {
    try {
      createOrUpdateProduct(product)
      logger.info(`[IPC] 产品已保存: ${product.title} (ID: ${product.id})`)
      return ok(product)
    } catch (e) {
      logger.warn(`[IPC] 产品保存失败: ${e}, ID: ${product.id}`)
      return err(3, '产品保存失败')
    }
  })

  ipcMain.handle('product:deleteById', (_event, { id }: { id: string }) => {
    deleteProduct(id)
    return ok(null)
  })

  // ─── Document ─────────────────────────────────────────────
  ipcMain.handle('document:list', () => {
    return ok(listDocuments())
  })

  ipcMain.handle('document:get', (_event, { key }: { key: string }) => {
    return ok(getDocument(key))
  })

  ipcMain.handle('document:all', () => {
    return ok(getAllDocuments())
  })

  ipcMain.handle(
    'document:upsert',
    (_event, { key, content }: { key: string; content: string }) => {
      upsertDocument(key, content)
      return ok(content)
    }
  )

  ipcMain.handle('document:delete', (_event, { key }: { key: string }) => {
    deleteDocument(key)
    return ok(null)
  })

  // ─── Conversation ─────────────────────────────────────────
  ipcMain.handle('conversation:list', () => {
    return ok(listConversations())
  })

  ipcMain.handle('conversation:getById', (_event, { chatId }: { chatId: string }) => {
    return ok(getConversationById(chatId))
  })

  ipcMain.handle('conversation:createOrUpdate', (_event, data: Conversation) => {
    return ok(createOrUpdateConversation(data))
  })

  ipcMain.handle('conversation:delete', (_event, { chatId }: { chatId: string }) => {
    return ok(deleteConversation(chatId))
  })

  // ─── Reply Queue ─────────────────────────────────────────────
  ipcMain.handle(
    'reply-queue:enqueue',
    (_event, { chatId, content }: { chatId: string; content: string }) => {
      try {
        // 追加消息到对话历史
        appendConversationMessage(chatId, content)

        // 推送到回复队列（幂等：重复 chatId 则失败）
        const queueResult = enqueue(chatId)
        if (!queueResult.success) {
          logger.warn(`[reply-queue:enqueue] 队列推送失败: ${queueResult.error}`)
        }

        return ok({ success: true })
      } catch (e) {
        logger.error(`[reply-queue:enqueue] 失败: ${e}`)
        return err(3, '发送失败')
      }
    }
  )

  // ─── Simulate Click ─────────────────────────────────────────────
  /**
   * 模拟鼠标点击（支持自然轨迹移动）
   * 注入脚本通过 window.electronAPI.simulateClick(x, y) 调用
   */
  ipcMain.handle('simulate:click', async (event, x: number, y: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      logger.warn('[simulate-click] 找不到对应的 BrowserWindow')
      return err(3004, '窗口不存在')
    }

    const wc = win.webContents

    // 辅助函数：延迟
    const sleep = (ms: number): Promise<void> =>
      new Promise<void>((resolve) => setTimeout(resolve, ms))

    // 辅助函数：生成随机延迟
    const randomDelay = (min: number, max: number): number => min + Math.random() * (max - min)

    // 辅助函数：模拟鼠标移动轨迹
    const simulateMouseMove = async (targetX: number, targetY: number): Promise<void> => {
      // 从目标坐标偏移 -100,-100 作为起点（避免从屏幕边缘开始）
      let currentX = Math.max(0, targetX - 100)
      let currentY = Math.max(0, targetY - 100)

      // 随机步数 10-30
      const steps = 10 + Math.floor(Math.random() * 20)
      const deltaX = (targetX - currentX) / steps
      const deltaY = (targetY - currentY) / steps

      for (let i = 0; i < steps; i++) {
        currentX += deltaX
        currentY += deltaY

        wc.sendInputEvent({
          type: 'mouseMove',
          x: Math.round(currentX),
          y: Math.round(currentY)
        })

        // 每步延迟 10-30ms
        await sleep(10 + Math.random() * 20)
      }
    }

    // 1. 模拟鼠标移动到目标位置（带轨迹）
    await simulateMouseMove(x, y)

    // 2. 随机延迟（模拟人类犹豫）100-300ms
    await sleep(randomDelay(100, 300))

    // 3. 模拟鼠标按下
    wc.sendInputEvent({
      type: 'mouseDown',
      x: x,
      y: y,
      button: 'left',
      clickCount: 1
    })

    // 4. 按下后延迟 50-150ms
    await sleep(randomDelay(50, 150))

    // 5. 模拟鼠标释放
    wc.sendInputEvent({
      type: 'mouseUp',
      x: x,
      y: y,
      button: 'left',
      clickCount: 1
    })

    logger.info(`[simulate-click] 点击完成: (${x}, ${y})`)
    return ok({ success: true })
  })

  // ─── Simulate Chinese Input ─────────────────────────────────────────────
  /**
   * 模拟中文输入（支持分块插入和 typo 模拟）
   * 注入脚本通过 window.electronAPI.simulateChineseInput(text) 调用
   */
  ipcMain.handle('simulate:chinese-input', async (event, text: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      logger.warn('[simulate-chinese-input] 找不到对应的 BrowserWindow')
      return err(3005, '窗口不存在')
    }

    const wc = win.webContents

    // 辅助函数：延迟
    const sleep = (ms: number): Promise<void> =>
      new Promise<void>((resolve) => setTimeout(resolve, ms))

    // 辅助函数：将文本拆分为"词"（2-4字符为一组）
    const splitIntoChineseWords = (str: string): string[] => {
      const words: string[] = []
      let i = 0
      while (i < str.length) {
        const wordLength = 2 + Math.floor(Math.random() * 3) // 2-4个字符
        words.push(str.slice(i, i + wordLength))
        i += wordLength
      }
      return words
    }

    // 辅助函数：模拟中文打错词 → 删除 → 重输
    const simulateChineseTypo = async (correctWord: string): Promise<void> => {
      // 常用中文字符集（用于生成随机错误词）
      const commonChars =
        '的一是了我不人在他有这个上们来到时大地为子中你说生国年着就那和要她出也得里后自以会家可下而过天去能对小多然于心学么之都好看起发当没成只如事把还用第样道想作种开美总从无情己面最女但现前些所同日手又行意动方期它头经长儿回位分爱老因很给名法间斯知世什两次使身者被高已亲其进此话常与活正感见明问力理尔点文几定本公特做外孩相西果走将月十实向声车全信重三机工物气每并别真打太新比才便夫再书部水像眼少家经'

      // 生成等长的随机错误词
      let typoWord = ''
      for (let i = 0; i < correctWord.length; i++) {
        typoWord += commonChars[Math.floor(Math.random() * commonChars.length)]
      }

      // 输入错误词
      wc.insertText(typoWord)
      await sleep(200 + Math.random() * 300) // 发现打错的停顿

      // Backspace 逐字删除
      for (let i = 0; i < typoWord.length; i++) {
        wc.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' })
        await sleep(20 + Math.random() * 30)
        wc.sendInputEvent({ type: 'keyUp', keyCode: 'Backspace' })
        await sleep(10 + Math.random() * 20)
      }
      await sleep(150 + Math.random() * 250) // 准备重输的停顿

      // 输入正确词
      wc.insertText(correctWord)
    }

    try {
      // 1. 先等待（模拟人类聚焦后思考）200-300ms
      await sleep(200 + Math.random() * 300)

      // 2. 将文本拆分为"词"
      const words = splitIntoChineseWords(text)

      // 3. 逐个输入词
      for (let i = 0; i < words.length; i++) {
        const word = words[i]

        // 4. 10% 概率模拟"打错词 → 删除 → 重输"（首个词块不触发）
        if (Math.random() < 0.1 && i > 0) {
          await simulateChineseTypo(word)
          continue
        }

        // 5. 系统级插入当前词
        wc.insertText(word)

        // 6. 随机延迟（模拟选词时间：100-300ms）
        await sleep(100 + Math.random() * 200)
      }

      logger.info(`[simulate-chinese-input] 输入完成: ${text.substring(0, 30)}...`)
      return ok({ success: true })
    } catch (e) {
      logger.error(`[simulate-chinese-input] 输入失败: ${e}`)
      return err(3001, '中文输入失败')
    }
  })

  // ─── Simulate Enter Key ─────────────────────────────────────────────
  /**
   * 模拟按 Enter 键（用于发送聊天消息）
   * 注入脚本通过 window.electronAPI.simulateEnterKey(x, y) 调用
   */
  ipcMain.handle('simulate:enter-key', async (event, { x, y }: { x: number; y: number }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      logger.warn('[simulate-enter-key] 找不到对应的 BrowserWindow')
      return err(3002, '窗口不存在')
    }

    const wc = win.webContents

    // 辅助函数：延迟
    const sleep = (ms: number): Promise<void> =>
      new Promise<void>((resolve) => setTimeout(resolve, ms))

    try {
      // 1. 先点击输入框获取焦点
      await sleep(100 + Math.random() * 100)
      wc.sendInputEvent({ type: 'mouseMove', x: Math.round(x), y: Math.round(y) })
      await sleep(50 + Math.random() * 50)
      wc.sendInputEvent({ type: 'mouseDown', x: x, y: y, button: 'left', clickCount: 1 })
      await sleep(50 + Math.random() * 50)
      wc.sendInputEvent({ type: 'mouseUp', x: x, y: y, button: 'left', clickCount: 1 })

      // 2. 等待焦点稳定
      await sleep(150 + Math.random() * 150)

      // 3. 按下 Enter
      wc.sendInputEvent({ type: 'keyDown', keyCode: 'Return' })
      await sleep(30 + Math.random() * 30)
      wc.sendInputEvent({ type: 'keyUp', keyCode: 'Return' })

      logger.info(`[simulate-enter-key] Enter 键发送完成`)
      return ok({ success: true })
    } catch (e) {
      logger.error(`[simulate-enter-key] Enter 键发送失败: ${e}`)
      return err(3003, 'Enter 键发送失败')
    }
  })
}
