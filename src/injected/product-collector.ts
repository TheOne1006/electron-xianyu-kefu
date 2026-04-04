/**
 * ProductCollector — 商品信息收集器
 *
 * 职责：在 /item 页面提供浮动按钮，用户点击后收集商品信息并通过 IPC 发送到主进程。
 * 合并了原 product-helpers/index.ts 的 DOM 提取逻辑。
 *
 * 设计要点：
 * - extractProduct() 为公共方法，方便测试和外部调用
 * - 删除 window.collectProduct 全局挂载
 * - 删除 product-helpers 副作用导入
 * - 保留 consola/browser 日志
 */
import { createConsola } from 'consola/browser'
import type { Product, InjectedElectronAPI } from '../shared/types'

const logger = createConsola({ defaults: { tag: 'injected:product-collector' } })

/** 注入脚本可调用的 Electron API（由 preload-browser.ts 注入） */
declare global {
  interface Window {
    electronAPI: InjectedElectronAPI
  }
}

export class ProductCollector {
  private button: HTMLButtonElement | null = null

  /**
   * 启动收集器，创建浮动按钮
   *
   * 等待 DOM 完全加载后在页面右下角显示「收集产品」按钮。
   */
  start(): void {
    logger.info('[收集器] 产品信息收集器已启动')
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createButton())
    } else {
      this.createButton()
    }
  }

  /**
   * 从当前页面 DOM 提取商品信息
   *
   * 提取逻辑：
   * - id: 从 URL 参数 id 获取
   * - title: 从 desc 元素的 innerHTML 第一行提取（处理 <br/> 换行）
   * - content: desc 元素的完整文本内容
   * - images: 从 item-main-window-list-item 元素中的 img 标签提取（排除 data: URL）
   * - mainImageUrl: 取 images 第一张
   */
  extractProduct(): Product {
    // 商品 ID：从 URL 参数提取
    const itemId = new URLSearchParams(window.location.search).get('id') || ''

    // 描述：优先查找商品详情区域（class 类似 desc--GaIUKUQY）
    const descEl = document.querySelector('[class*="desc--"]')
    const content = descEl?.textContent?.trim() || ''

    // 标题：从描述 HTML 中提取，处理 <br/> 或 \n 换行，取第一行
    // 先按 <br/> 分割取第一段，再清理首尾换行和 HTML 标签
    const title =
      descEl?.innerHTML
        .split(/<br\s*\/?>/i)[0]
        .replace(/<[^>]+>/g, '')
        .trim() || ''

    // 商品图片：从 item-main-window-list-item-- 中获取
    const imageEls = document.querySelectorAll('[class*="item-main-window-list-item--"] img')
    const images = Array.from(imageEls)
      .map((img) => (img as HTMLImageElement).src)
      .filter((src) => src && !src.includes('data:'))

    return {
      id: itemId,
      title,
      images,
      mainImageUrl: images[0] ?? '',
      content,
      documentKeys: []
    }
  }

  /**
   * 创建浮动收集按钮
   */
  private createButton(): void {
    // 移除已存在的按钮
    this.removeButton()

    this.button = document.createElement('button')
    this.button.textContent = '📦 收集产品'
    this.button.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      z-index: 9999;
      padding: 12px 20px;
      background: #007aff;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `
    this.button.addEventListener('click', () => this.collectAndSend())
    document.body.appendChild(this.button)
  }

  /**
   * 移除浮动按钮
   */
  private removeButton(): void {
    if (this.button) {
      this.button.remove()
      this.button = null
    }
  }

  /**
   * 收集商品信息并发送到主进程
   *
   * 流程：extractProduct() → electronAPI.product.upsert() → 更新按钮状态
   */
  private async collectAndSend(): Promise<void> {
    logger.info('[收集器] 开始收集产品')
    logger.info('[收集器] electronAPI 存在:', !!window.electronAPI)

    if (!window.electronAPI) {
      logger.error('[收集器] electronAPI 不可用，收集取消')
      if (this.button) {
        this.button.textContent = '❌ 收集失败'
        this.button.disabled = false
      }
      return
    }

    const product = this.extractProduct()
    logger.info('[收集器] extractProduct() 结果:', product)

    if (!product || !product.id) {
      logger.warn('[收集器] 无法获取产品信息，请确保在商品详情页')
      return
    }

    logger.info('[收集器] 已提取产品:', product.title)

    // 禁用按钮，防止重复点击
    if (this.button) {
      this.button.disabled = true
      this.button.textContent = '⏳ 收集中...'
    }

    try {
      const result = await window.electronAPI.product.upsert(product)
      logger.info('[收集器] electronAPI.product.upsert 返回:', result)

      if (result?.code === 0) {
        logger.info('[收集器] 产品已保存:', product.id)
        if (this.button) {
          this.button.textContent = '✅ 已收集'
        }
      } else {
        logger.error('[收集器] 产品保存失败:', result?.message)
        if (this.button) {
          this.button.textContent = '❌ 收集失败'
          this.button.disabled = false
        }
      }
    } catch (err) {
      logger.error('[收集器] 保存失败:', err)
      if (this.button) {
        this.button.textContent = '❌ 收集失败'
        this.button.disabled = false
      }
    }
  }
}
