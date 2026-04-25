import { consola } from 'consola'
import { createXYBrowserWindow, closeXYBrowserWindow, isXYBrowserRunning } from '../browser'
import { getAppConfig, saveAppConfig } from '../stores/app-config-store'
import type { AppConfig } from '../../shared/types'
import { ok, err } from '../ipc-response'
import { safeHandle } from './safe-handle'

const logger = consola.withTag('ipc:core')

export function registerCoreHandlers(): void {
  safeHandle('ping', () => {
    return ok('pong')
  })

  safeHandle('config:get', () => {
    return ok(getAppConfig())
  })

  safeHandle('config:save', (_event, config: Partial<AppConfig>) => {
    saveAppConfig(config)
    logger.info('[config:save] 应用配置已保存')
    return ok(null)
  })

  safeHandle('xy-browser:launch', (_event, config: AppConfig) => {
    createXYBrowserWindow(config)
    logger.info('[xy-browser:launch] 闲鱼浏览器已启动')
    return ok(null)
  })

  safeHandle('xy-browser:close', () => {
    closeXYBrowserWindow()
    logger.info('[xy-browser:close] 闲鱼浏览器已关闭')
    return ok(null)
  })

  safeHandle('xy-browser:getStatus', () => {
    return ok(isXYBrowserRunning())
  })

  safeHandle('config:testWebhook', async () => {
    const config = getAppConfig()
    if (!config.orderWebhookUrl) {
      return err(1, '请先填写 Webhook URL')
    }
    const url = config.orderWebhookUrl.replace('<title>', encodeURIComponent('demo'))
    logger.info(`[config:testWebhook] 测试请求: ${url}`)
    try {
      const resp = await fetch(url)
      return ok({ status: resp.status, statusText: resp.statusText })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.error(`[config:testWebhook] 请求失败: ${msg}`)
      return err(2, `请求失败: ${msg}`)
    }
  })
}
