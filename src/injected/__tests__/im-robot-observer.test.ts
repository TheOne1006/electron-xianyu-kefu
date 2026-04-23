/**
 * ImRobot MutationObserver 相关单元测试
 *
 * 测试 Observer 监听、debounce、状态机事件驱动逻辑。
 * 使用 jsdom 构造 DOM 环境。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'

// Mock electronAPI
const mockElectronAPI = {
  simulateClick: vi.fn().mockResolvedValue({ code: 0, message: '', data: { success: true } }),
  simulateChineseInput: vi
    .fn()
    .mockResolvedValue({ code: 0, message: '', data: { success: true } }),
  simulateEnterKey: vi.fn().mockResolvedValue({ code: 0, message: '', data: { success: true } }),
  replyQueue: {
    dequeue: vi
      .fn()
      .mockResolvedValue({ code: 1, message: 'empty', data: { chatId: null, replyText: null } })
  },
  conversation: {
    upsert: vi.fn().mockResolvedValue({ code: 0, message: '', data: null }),
    getById: vi.fn().mockResolvedValue({ code: 1, message: 'not found', data: null })
  },
  product: {
    list: vi.fn().mockResolvedValue({
      code: 0,
      message: '',
      data: [
        {
          id: '100001',
          title: 'iPhone 15',
          mainImageUrl: 'https://img.example.com/iphone15.jpg',
          images: [],
          documentKeys: []
        }
      ]
    })
  }
}

function setupDOM(html: string, url = 'https://www.goofish.com/im'): void {
  const dom = new JSDOM(html, { url })
  globalThis.document = dom.window.document
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.MutationObserver = dom.window.MutationObserver as unknown as typeof MutationObserver
  ;(globalThis.window as unknown as Record<string, unknown>).electronAPI = mockElectronAPI
}

function teardownDOM(): void {
  delete (globalThis as unknown as Record<string, unknown>).document
  delete (globalThis as unknown as Record<string, unknown>).window
  delete (globalThis as unknown as Record<string, unknown>).MutationObserver
}

describe('ImRobot Observer 模式', () => {
  beforeEach(() => {
    teardownDOM()
    vi.clearAllMocks()
  })

  afterEach(() => {
    teardownDOM()
  })

  it('启动时注册全局命令接口', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    expect((globalThis.window as unknown as Record<string, unknown>).__robotCommands).toBeDefined()
    expect(
      typeof (globalThis.window as unknown as Record<string, unknown>).__robotCommands === 'object'
    ).toBe(true)

    robot.stop()
  })

  it('getStatus 返回当前状态', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    const commands = (globalThis.window as unknown as Record<string, unknown>).__robotCommands as {
      getStatus: () => { state: string; lastActivity: number }
    }
    const status = commands.getStatus()
    expect(status.state).toBe('IDLE')
    expect(status.lastActivity).toBeGreaterThan(0)

    robot.stop()
  })

  it('sendReply 在非 IDLE 状态时返回 busy', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    robot.state = 'PROCESSING_COLLECT'

    const commands = (globalThis.window as unknown as Record<string, unknown>).__robotCommands as {
      sendReply: (chatId: string, text: string) => Promise<{ success: boolean; reason?: string }>
    }
    const result = await commands.sendReply('test-chat-id', '测试回复')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('busy')

    robot.stop()
  })

  it('sendReply 在 chatInfo 不存在时返回 chat_not_found', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    mockElectronAPI.conversation.getById.mockResolvedValueOnce({
      code: 1,
      message: 'not found',
      data: null
    })

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    const commands = (globalThis.window as unknown as Record<string, unknown>).__robotCommands as {
      sendReply: (chatId: string, text: string) => Promise<{ success: boolean; reason?: string }>
    }
    const result = await commands.sendReply('nonexistent-chat', '测试回复')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('chat_not_found')

    robot.stop()
  })

  it('启动时创建 MutationObserver', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    expect(robot['observer']).not.toBeNull()

    robot.stop()
  })

  it('stop 时断开 Observer 并清理定时器', async () => {
    setupDOM(`
      <div class="conversation-list--mock">
        <div class="conversation-item--mock">item</div>
      </div>
    `)

    const { ImRobot } = await import('../im-robot')
    const robot = new ImRobot()
    await robot.start()

    robot.stop()

    expect(robot['observer']).toBeNull()
    expect(robot['fallbackTimer']).toBeNull()
    expect(robot['debounceTimer']).toBeNull()
  })
})
