/**
 * Store 工具函数
 */

/**
 * 清理 id 中的不安全字符，防止路径遍历等安全问题
 * 只保留字母、数字、中文字符、下划线和横线
 */
export function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '_')
}
