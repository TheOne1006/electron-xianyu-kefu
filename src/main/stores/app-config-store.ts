import Store from 'electron-store'
import type { AppConfig } from '../../shared/types'

import defaultConfig from '@shared/defaults/configs/app-config.json'

/**
 * 从 @shared/defaults 加载默认应用配置
 *
 * @returns 默认的 AppConfig 对象
 */
function loadDefaultAppConfig(): AppConfig {
  return defaultConfig as AppConfig
}

const defaultAppConfig = loadDefaultAppConfig()
const StoreClass = (Store as unknown as { default: typeof Store }).default || Store

export const appStore = new StoreClass<AppConfig>({
  name: 'config',
  defaults: defaultAppConfig
})

/**
 * 获取当前应用配置
 *
 * @returns 完整的 AppConfig 对象
 */
export function getAppConfig(): AppConfig {
  return appStore.store
}

/**
 * 保存应用配置（浅合并）
 *
 * @param config - 需要更新的配置字段（部分更新）
 */
export function saveAppConfig(config: Partial<AppConfig>): void {
  const current = getAppConfig()
  appStore.set({ ...current, ...config })
}

/**
 * 全量替换应用配置（用于导入，不做合并，直接覆盖）
 */
export function replaceAppConfig(config: AppConfig): void {
  appStore.set(config)
}
