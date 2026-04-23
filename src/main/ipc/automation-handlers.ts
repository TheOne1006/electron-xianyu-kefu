import { BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { consola } from 'consola'

import { BrowserAutomationService } from '../automation/browser-automation-service'
import { err, ok } from '../ipc-response'
import { safeHandle } from './safe-handle'

const logger = consola.withTag('ipc:automation')

function resolveAutomationService(
  event: IpcMainInvokeEvent,
  missingWindowCode: number,
  missingWindowMessage: string,
  context: string
): { service: BrowserAutomationService | null; errorResult: ReturnType<typeof err> | null } {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) {
    logger.warn(`[${context}] 找不到对应的 BrowserWindow`)
    return {
      service: null,
      errorResult: err(missingWindowCode, missingWindowMessage)
    }
  }

  return {
    service: new BrowserAutomationService(window.webContents),
    errorResult: null
  }
}

export function registerAutomationHandlers(): void {
  safeHandle('simulate:click', async (event, x: number, y: number) => {
    const { service, errorResult } = resolveAutomationService(
      event,
      3004,
      '窗口不存在',
      'simulate-click'
    )
    if (!service) {
      return errorResult
    }

    await service.click({ x, y })
    logger.info(`[simulate-click] 点击完成: (${x}, ${y})`)
    return ok({ success: true })
  })

  safeHandle('simulate:chinese-input', async (event, text: string) => {
    const { service, errorResult } = resolveAutomationService(
      event,
      3005,
      '窗口不存在',
      'simulate-chinese-input'
    )
    if (!service) {
      return errorResult
    }

    try {
      await service.typeChinese(text)
      logger.info(`[simulate-chinese-input] 输入完成: ${text.substring(0, 30)}...`)
      return ok({ success: true })
    } catch (error) {
      logger.error(`[simulate-chinese-input] 输入失败: ${error}`)
      return err(3001, '中文输入失败')
    }
  })

  safeHandle('simulate:enter-key', async (event, { x, y }: { x: number; y: number }) => {
    const { service, errorResult } = resolveAutomationService(
      event,
      3002,
      '窗口不存在',
      'simulate-enter-key'
    )
    if (!service) {
      return errorResult
    }

    try {
      await service.pressEnter({ x, y })
      logger.info('[simulate-enter-key] Enter 键发送完成')
      return ok({ success: true })
    } catch (error) {
      logger.error(`[simulate-enter-key] Enter 键发送失败: ${error}`)
      return err(3003, 'Enter 键发送失败')
    }
  })
}
