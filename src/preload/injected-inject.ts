/**
 * 注入脚本加载模块
 *
 * 职责：加载 injected.bundle.js 文件供 preload-browser.ts 注入
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createConsola } from 'consola/browser'

const logger = createConsola({ defaults: { tag: 'preload:injected-inject' } })

const INJECTED_BUNDLE_PATH = '../../resources/injected.bundle.js'

/** 加载 injected.bundle.js 文件内容 */
export function loadInjectedCode(): string {
  const filePath = join(__dirname, INJECTED_BUNDLE_PATH)
  const code = readFileSync(filePath, 'utf-8')
  logger.info('Loaded injected.bundle.js, size:', code.length)
  return code
}
