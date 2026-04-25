import { app } from 'electron'
import path from 'path'

/**
 * Store 工具函数
 */

/**
 * 获取统一的 store 数据目录路径
 * 所有 electron-store 实例使用此目录，避免与 Electron 内部文件混杂
 */
export function getStoreCwd(): string {
  return path.join(app.getPath('userData'), 'app-data')
}

/**
 * 清理 id 中的不安全字符，防止路径遍历等安全问题
 * 只保留字母、数字、中文字符、下划线和横线
 */
export function safeId(id: string): string {
  if (!id) return ''
  return String(id).replace(/[^\w\-\u4e00-\u9fa5]/g, '_')
}
