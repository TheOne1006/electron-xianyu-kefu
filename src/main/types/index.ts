/**
 * 浏览器窗口相关类型定义
 */

import type { BrowserWindow } from 'electron'

/** 窗口创建配置 */
export interface WindowConfig {
  width?: number
  height?: number
  title?: string
  icon?: string
  preload: string
  webSecurity?: boolean
  additionalArguments?: string[]
  onReadyToShow?: (bw: BrowserWindow) => void
  onWindowOpen?: (bw: BrowserWindow, url: string) => void
}
