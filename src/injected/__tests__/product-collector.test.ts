/**
 * ProductCollector 商品收集器单元测试
 *
 * 使用 jsdom 手动构造 document/window 来测试 DOM 提取逻辑。
 * vitest 配置 environment 为 node，所以需要手动设置全局 DOM。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { ProductCollector } from '../product-collector'

// ─── DOM 辅助函数 ──────────────────────────────────────────────

/**
 * 使用 jsdom 构造全局 document / window
 * 注入 electronAPI mock 以满足 IPC 调用需求
 */
function setupDOM(html: string, url = 'https://www.goofish.com/item?id=test123'): void {
  const dom = new JSDOM(html, { url })
  globalThis.document = dom.window.document
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.window.electronAPI = {
    product: {
      upsert: vi.fn().mockResolvedValue({ code: 0, message: 'ok', data: {} }),
      list: vi.fn().mockResolvedValue({ code: 0, message: 'ok', data: [] })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

/** 每次测试前清空全局 DOM */
function teardownDOM(): void {
  delete (globalThis as Record<string, unknown>).document
  delete (globalThis as Record<string, unknown>).window
}

// ─── 测试用例 ──────────────────────────────────────────────────

describe('ProductCollector', () => {
  let collector: ProductCollector

  beforeEach(() => {
    teardownDOM()
    collector = new ProductCollector()
  })

  // ─── extractProduct ─────────────────────────────────────────

  describe('extractProduct', () => {
    it('从 DOM 提取商品信息（id、title、images）', () => {
      setupDOM(`
        <body>
          <div class="desc--GaIUKUQY">
            商品标题第一行<br/>这是第二行描述内容
          </div>
          <div class="item-main-window-list-item--abc">
            <img src="https://img.example.com/product1.jpg" />
          </div>
          <div class="item-main-window-list-item--def">
            <img src="https://img.example.com/product2.jpg" />
          </div>
        </body>
      `)

      const product = collector.extractProduct()

      expect(product.id).toBe('test123')
      expect(product.title).toBe('商品标题第一行')
      expect(product.images).toHaveLength(2)
      expect(product.images[0]).toBe('https://img.example.com/product1.jpg')
      expect(product.images[1]).toBe('https://img.example.com/product2.jpg')
      expect(product.mainImageUrl).toBe('https://img.example.com/product1.jpg')
    })

    it('URL 无 id 参数时 id 为空字符串', () => {
      setupDOM(`<body><div class="desc--abc">只有标题</div></body>`, 'https://www.goofish.com/item')

      const product = collector.extractProduct()

      expect(product.id).toBe('')
    })

    it('无 desc 元素时返回默认值', () => {
      setupDOM(`<body></body>`)

      const product = collector.extractProduct()

      expect(product.id).toBe('test123')
      expect(product.title).toBe('')
      expect(product.content).toBe('')
      expect(product.images).toEqual([])
      expect(product.mainImageUrl).toBe('')
    })
  })
})
