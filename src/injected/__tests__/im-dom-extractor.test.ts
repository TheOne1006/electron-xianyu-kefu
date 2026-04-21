/**
 * ImDomExtractor 静态工具类单元测试
 *
 * 使用 jsdom 手动构造 document/window 来测试 DOM 提取逻辑。
 * vitest 配置 environment 为 node，所以需要手动设置全局 DOM。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { ImDomExtractor } from '../im-dom-extractor'

// ─── DOM 辅助函数 ──────────────────────────────────────────────

/**
 * 使用 jsdom 构造全局 document / window
 * 注入脚本依赖这些全局对象进行 DOM 操作
 */
function setupDOM(html: string, url = 'https://www.goofish.com/im'): void {
  const dom = new JSDOM(html, { url })
  globalThis.document = dom.window.document
  globalThis.window = dom.window as unknown as Window & typeof globalThis
}

/** 每次测试前清空全局 DOM */
function teardownDOM(): void {
  delete (globalThis as Record<string, unknown>).document
  delete (globalThis as Record<string, unknown>).window
}

// ─── 测试用例 ──────────────────────────────────────────────────

describe('ImDomExtractor', () => {
  beforeEach(() => {
    teardownDOM()
  })

  // ─── getCurrentChatInfo ────────────────────────────────────

  describe('getCurrentChatInfo', () => {
    it('有用户名和商品链接时正确提取', () => {
      setupDOM(`
        <div>
          <span class="text1--abc">买家小明</span>
          <a href="https://www.goofish.com/item?id=123456789">商品链接</a>
        </div>
      `)

      const result = ImDomExtractor.getCurrentChatInfo()

      expect(result.userName).toBe('买家小明')
      expect(result.itemId).toBe('123456789')
      expect(result.isMyProduct).toBe(false)
    })

    it('无用户名时返回空字符串', () => {
      setupDOM(`<div></div>`)

      const result = ImDomExtractor.getCurrentChatInfo()

      expect(result.userName).toBe('')
      expect(result.itemId).toBe('')
      expect(result.isMyProduct).toBe(false)
    })
  })

  // ─── hasUnreadMessages ─────────────────────────────────────

  describe('hasUnreadMessages', () => {
    it('有 badge title >= 1 时返回 true', () => {
      setupDOM(`
        <div class="conv-header--xyz">
          <sup class="ant-scroll-number" title="3"></sup>
        </div>
      `)

      expect(ImDomExtractor.hasUnreadMessages()).toBe(true)
    })

    it('badge 文本含数字 >= 1 时返回 true', () => {
      setupDOM(`
        <div class="conv-header--xyz">
          <sup class="ant-scroll-number">2</sup>
        </div>
      `)

      expect(ImDomExtractor.hasUnreadMessages()).toBe(true)
    })

    it('无 badge 时返回 false', () => {
      setupDOM(`
        <div class="conv-header--xyz">
        </div>
      `)

      expect(ImDomExtractor.hasUnreadMessages()).toBe(false)
    })

    it('无 conv-header 时返回 false', () => {
      setupDOM(`<div></div>`)

      expect(ImDomExtractor.hasUnreadMessages()).toBe(false)
    })
  })

  // ─── getChatMessages ───────────────────────────────────────

  describe('getChatMessages', () => {
    it('解析文本消息', () => {
      // 模拟闲鱼聊天消息列表结构
      setupDOM(`
        <ul class="ant-list-items">
          <li class="ant-list-item">
            <div class="message-row--xyz">
              <div class="avatar--abc"></div>
              <div>
                <div>卖家昵称</div>
              </div>
              <div class="message-text--xyz">
                <span>你好，请问还在吗？</span>
              </div>
            </div>
          </li>
        </ul>
      `)

      const messages = ImDomExtractor.getChatMessages()

      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('text')
      expect(messages[0].content).toBe('你好，请问还在吗？')
      expect(messages[0].isSelf).toBe(false)
      expect(messages[0].sender).toBe('卖家昵称')
    })

    it('检测支付卡片并提取 paymentInfo', () => {
      setupDOM(`
        <ul class="ant-list-items">
          <li class="ant-list-item">
            <div class="message-row--xyz">
              <div class="avatar--abc"></div>
              <div>
                <div>系统通知</div>
              </div>
              <div class="ant-dropdown-trigger message-content--xyz">
                <div class="msg-dx-content--xyz msg-text-left--xyz">
                  <div>
                    <div class="msg-dx-title--xyz">我已付款，等待你发货</div>
                    <div class="msg-dx-line--xyz"></div>
                    <div class="msg-dx-desc--xyz">请包装好商品，并按我在闲鱼上提供的地址发货</div>
                    <button class="msg-dx-button--xyz">
                      <div class="msg-dx-button-text--xyz">去发货</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      `)

      const messages = ImDomExtractor.getChatMessages()

      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('card')
      expect(messages[0].paymentInfo).toBeDefined()
      expect(messages[0].paymentInfo?.title).toBe('我已付款，等待你发货')
      expect(messages[0].paymentInfo?.description).toBe('请包装好商品，并按我在闲鱼上提供的地址发货')
      expect(messages[0].sender).toBe('系统通知')
      expect(messages[0].isSelf).toBe(false)
    })

    it('普通 card 不包含 paymentInfo', () => {
      setupDOM(`
        <ul class="ant-list-items">
          <li class="ant-list-item">
            <div class="message-row--xyz">
              <div class="avatar--abc"></div>
              <div>
                <div>买家</div>
              </div>
              <div>
                <a href="https://www.goofish.com/item?id=123">
                  <div class="card--xyz">
                    <div class="title--xyz">商品标题</div>
                    <div class="price--xyz">¥99</div>
                  </div>
                </a>
              </div>
            </div>
          </li>
        </ul>
      `)

      const messages = ImDomExtractor.getChatMessages()

      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('card')
      expect(messages[0].paymentInfo).toBeUndefined()
      expect(messages[0].cardInfo).toBeDefined()
    })

    it('无消息列表时返回空数组', () => {
      setupDOM(`<div></div>`)

      const messages = ImDomExtractor.getChatMessages()

      expect(messages).toEqual([])
    })
  })

  // ─── getCurrentWindowSnapshot ──────────────────────────────

  describe('getCurrentWindowSnapshot', () => {
    it('正常聊天窗口提取完整快照', () => {
      setupDOM(`
        <main>
          <div>
            <div>
              <span class="text1--abc">买家小明</span>
              <a href="https://www.goofish.com/item?id=123456789">商品链接</a>
            </div>
          </div>
          <div>
            <ul class="ant-list-items">
              <li class="ant-list-item">
                <div class="message-row--xyz">
                  <div class="message-text--xyz"><span>你好</span></div>
                  <div class="avatar--abc"></div>
                </div>
              </li>
              <li class="ant-list-item">
                <div class="message-row--xyz">
                  <div class="avatar--abc"></div>
                  <div>
                    <div>买家小明</div>
                  </div>
                  <div class="message-text--xyz"><span>请问还在吗？</span></div>
                </div>
              </li>
            </ul>
          </div>
        </main>
      `)

      const snapshot = ImDomExtractor.getCurrentWindowSnapshot()

      expect(snapshot.isChatOpen).toBe(true)
      expect(snapshot.userName).toBe('买家小明')
      expect(snapshot.itemId).toBe('123456789')
      expect(snapshot.lastUserMessage).toBe('请问还在吗？')
    })

    it('无 main 区域时 isChatOpen 为 false', () => {
      setupDOM(`<div>空页面</div>`)

      const snapshot = ImDomExtractor.getCurrentWindowSnapshot()

      expect(snapshot.isChatOpen).toBe(false)
      expect(snapshot.userName).toBe('')
      expect(snapshot.itemId).toBe('')
      expect(snapshot.lastUserMessage).toBe('')
    })

    it('聊天窗口打开但无用户名时 isChatOpen 为 false', () => {
      setupDOM(`
        <main>
          <div>
            <div></div>
          </div>
        </main>
      `)

      const snapshot = ImDomExtractor.getCurrentWindowSnapshot()

      expect(snapshot.isChatOpen).toBe(false)
    })

    it('只有自己发的消息时 lastUserMessage 为空', () => {
      setupDOM(`
        <main>
          <div>
            <div>
              <span class="text1--abc">买家小明</span>
              <a href="https://www.goofish.com/item?id=123456789">商品链接</a>
            </div>
          </div>
          <div>
            <ul class="ant-list-items">
              <li class="ant-list-item">
                <div class="message-row--xyz">
                  <div class="message-text--xyz"><span>我的回复</span></div>
                  <div class="avatar--abc"></div>
                </div>
              </li>
            </ul>
          </div>
        </main>
      `)

      const snapshot = ImDomExtractor.getCurrentWindowSnapshot()

      expect(snapshot.isChatOpen).toBe(true)
      expect(snapshot.lastUserMessage).toBe('')
    })

    it('无商品链接时 itemId 为空', () => {
      setupDOM(`
        <main>
          <div>
            <div>
              <span class="text1--abc">买家小明</span>
            </div>
          </div>
          <div>
            <ul class="ant-list-items">
              <li class="ant-list-item">
                <div class="message-row--xyz">
                  <div class="avatar--abc"></div>
                  <div class="message-text--xyz"><span>你好</span></div>
                </div>
              </li>
            </ul>
          </div>
        </main>
      `)

      const snapshot = ImDomExtractor.getCurrentWindowSnapshot()

      expect(snapshot.isChatOpen).toBe(true)
      expect(snapshot.itemId).toBe('')
    })
  })

  // ─── getChatList ───────────────────────────────────────────

  describe('getChatList', () => {
    it('解析会话列表项', () => {
      // 模拟闲鱼会话列表的 DOM 结构
      // 图片遍历顺序：第一个不是 badge/order 父级的 img 会被选为 itemImage
      // 所以 product 图片要在 avatar 图片之前（或 avatar 图片的父元素要有 ant-badge 类名）
      setupDOM(`
        <div>
          <div class="conversation-item--abc">
            <div class="ant-dropdown-trigger">
              <div>
                <div class="avatar-area">
                  <span class="ant-badge">
                    <img src="https://avatar.example.com/user1.jpg" />
                  </span>
                </div>
                <div>
                  <div></div>
                  <div>
                    <div>用户A</div>
                  </div>
                  <div>最新消息内容</div>
                  <div>3分钟前</div>
                </div>
                <img src="https://item.example.com/product1.jpg" />
              </div>
            </div>
          </div>
        </div>
      `)

      const list = ImDomExtractor.getChatList()

      expect(list).toHaveLength(1)
      expect(list[0].userName).toBe('用户A')
      expect(list[0].lastMessage).toBe('最新消息内容')
      expect(list[0].time).toBe('3分钟前')
      expect(list[0].type).toBe('user')
      expect(list[0].hasItemImage).toBe(true)
      expect(list[0].itemImage).toContain('product1.jpg')
    })

    it('无会话项时返回空数组', () => {
      setupDOM(`<div></div>`)

      const list = ImDomExtractor.getChatList()

      expect(list).toEqual([])
    })
  })
})
