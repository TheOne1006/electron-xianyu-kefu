import { useCallback, useEffect, useState } from 'react'
import defaultAppConfig from '@shared/defaults/configs/app-config.json'
import type { AppConfig } from '@shared/types'
import { useToast } from '../contexts/ToastContext'

/** 配置页使用的默认应用配置，统一来自共享 `app-config.json`。 */
export const DEFAULT_APP_CONFIG: AppConfig = defaultAppConfig

/** 配置页表单状态。 */
export interface ConfigsPageState {
  config: AppConfig
  keywordInput: string
}

/** 配置页 hook 暴露的状态与操作。 */
export interface UseConfigsPageResult extends ConfigsPageState {
  loading: boolean
  saving: boolean
  setKeywordInput: (value: string) => void
  handleFieldChange: (field: keyof AppConfig, value: string) => void
  commitKeywordInput: () => void
  handleSave: () => Promise<void>
}

/**
 * 解析关键词输入框内容，按中英文逗号分隔，去掉空白与重复项。
 */
export function parseKeywordInput(input: string): string[] {
  const uniqueKeywords = new Set<string>()

  for (const rawKeyword of input.split(/[,，]/)) {
    const keyword = rawKeyword.trim()
    if (!keyword) continue
    uniqueKeywords.add(keyword)
  }

  return [...uniqueKeywords]
}

/**
 * 将关键词数组格式化为稳定的输入框内容。
 */
export function stringifyKeywordInput(keywords: string[]): string {
  return parseKeywordInput(keywords.join(',')).join(', ')
}

/**
 * 将远端配置与共享默认值合并，并标准化关键词字段。
 */
export function mergeAppConfigWithDefaults(config?: Partial<AppConfig>): AppConfig {
  return {
    ...DEFAULT_APP_CONFIG,
    ...config,
    safetyFilterBlockedKeywords: parseKeywordInput(
      (config?.safetyFilterBlockedKeywords ?? DEFAULT_APP_CONFIG.safetyFilterBlockedKeywords).join(
        ','
      )
    ),
    orderWebhookUrl: config?.orderWebhookUrl ?? DEFAULT_APP_CONFIG.orderWebhookUrl ?? ''
  }
}

/**
 * 根据应用配置构造配置页需要的表单状态。
 */
export function createConfigsPageState(config?: Partial<AppConfig>): ConfigsPageState {
  const mergedConfig = mergeAppConfigWithDefaults(config)

  return {
    config: mergedConfig,
    keywordInput: stringifyKeywordInput(mergedConfig.safetyFilterBlockedKeywords)
  }
}

/**
 * 管理配置页的数据加载、关键词编辑与保存行为。
 */
export function useConfigsPage(): UseConfigsPageResult {
  const [state, setState] = useState<ConfigsPageState>(() => createConfigsPageState())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    window.electron.config
      .get()
      .then((savedConfig) => {
        setState(createConfigsPageState(savedConfig))
      })
      .catch((error) => {
        showToast('error', `加载配置失败: ${error}`)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [showToast])

  /**
   * 更新单个配置字段。
   */
  const handleFieldChange = useCallback((field: keyof AppConfig, value: string) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, [field]: value }
    }))
  }, [])

  /**
   * 将输入框字符串同步为标准化的关键词数组。
   */
  const commitKeywordInput = useCallback(() => {
    setState((prev) => {
      const keywords = parseKeywordInput(prev.keywordInput)
      return {
        config: { ...prev.config, safetyFilterBlockedKeywords: keywords },
        keywordInput: stringifyKeywordInput(keywords)
      }
    })
  }, [])

  /**
   * 保存配置前先提交关键词输入，确保发送给主进程的是标准化结果。
   */
  const handleSave = useCallback(async () => {
    const keywords = parseKeywordInput(state.keywordInput)
    const nextConfig = {
      ...state.config,
      safetyFilterBlockedKeywords: keywords
    }

    setSaving(true)
    try {
      await window.electron.config.save(nextConfig)
      setState({
        config: nextConfig,
        keywordInput: stringifyKeywordInput(keywords)
      })
      showToast('success', '配置保存成功')
    } catch (error) {
      showToast('error', `保存配置失败: ${error}`)
    } finally {
      setSaving(false)
    }
  }, [showToast, state.config, state.keywordInput])

  return {
    ...state,
    loading,
    saving,
    setKeywordInput: (value) => {
      setState((prev) => ({
        ...prev,
        keywordInput: value
      }))
    },
    handleFieldChange,
    commitKeywordInput,
    handleSave
  }
}
