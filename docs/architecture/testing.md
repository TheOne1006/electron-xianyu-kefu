# 测试方案

> 框架：Vitest 4.1.2 + Node.js 环境 + vi.mock()

## 测试架构

```
src/main/__tests__/
├── __mocks__/
│   └── electron.ts              # Electron API 集中 mock
├── setup.ts                      # 全局 setup（mock electron-store/consola）
├── browser.test.ts               # 窗口管理测试
├── business/                     # 业务逻辑测试
│   ├── agent.test.ts             # 消息编排流程
│   ├── agent-runner.test.ts      # LLM 执行引擎
│   ├── intent-router.test.ts     # 意图分类
│   ├── llm-adapter.test.ts       # LLM API 集成
│   └── safety-filter.test.ts     # 安全过滤
├── stores/                       # Store 单元测试
│   ├── agent-config-store.test.ts
│   ├── app-config-store.test.ts
│   └── prompt-store.test.ts
└── storage/                      # 存储层测试
    ├── conversation-store.test.ts
    ├── product-store.test.ts
    └── file-manager.test.ts
```

## 测试命令

```bash
pnpm test                # 运行所有测试
pnpm test:watch          # 监听模式
pnpm test:coverage       # 生成覆盖率报告
pnpm vitest run src/main/__tests__/business/agent.test.ts  # 运行单个测试文件
```

## Mock 策略

### 1. Electron 模块 Mock (`__mocks__/electron.ts`)

```typescript
// 提供可复用的 mock 实例
export const mockWebContents = { send: vi.fn(), ... }
export const mockBrowserWindowInstance = { webContents: mockWebContents, ... }
export const mockApp = { getPath: vi.fn(), on: vi.fn(), ... }
export const mockIpcMain = { handle: vi.fn(), ... }

// 每个 test 文件调用重置
export function resetElectronMocks()
```

### 2. electron-store Mock (`setup.ts`)

使用内存对象模拟持久化：

```typescript
vi.mock('electron-store', () => {
  const data: Record<string, unknown> = {}
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn((key) => data[key]),
      set: vi.fn((key, value) => {
        data[key] = value
      }),
      delete: vi.fn((key) => {
        delete data[key]
      })
    }))
  }
})
```

### 3. 文件系统 Mock

使用 `memfs` 隔离真实文件系统：

```typescript
import { vol, fs } from 'memfs'

vi.mock('node:fs', () => ({
  existsSync: (p) => fs.existsSync(p),
  readFileSync: (p, enc) => fs.readFileSync(p, enc),
  writeFileSync: (p, data) => fs.writeFileSync(p, data)
}))

beforeEach(() => {
  vol.reset()
})
```

### 4. 日志 Mock (`setup.ts`)

静默所有 consola 输出：

```typescript
vi.mock('consola', () => ({
  consola: {
    withTag: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    }))
  }
}))
```

## 各层测试规范

### 主进程 Business 层

| 测试文件                | 测试目标                | Mock 策略                                                                  |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `agent.test.ts`         | 消息编排完整流程        | mock conversation-store, intent-router, agent-runner, browser, reply-queue |
| `agent-runner.test.ts`  | LLM API 调用 + 安全过滤 | mock agent-config-store, llm-adapter, safety-filter                        |
| `intent-router.test.ts` | 关键词预检 + LLM 兜底   | mock agent-runner                                                          |
| `safety-filter.test.ts` | 关键词匹配替换          | 直接 mock store 模块                                                       |
| `llm-adapter.test.ts`   | OpenAI SDK 集成         | mock app-config-store, OpenAI 构造函数                                     |

**编写模式：**

```typescript
describe('模块名', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 重置特定 mock 返回值
    mockSomeDep.mockReturnValue('default')
  })

  it('should 正常行为描述', async () => {
    // Arrange
    mockSomething.mockResolvedValue(expectedData)

    // Act
    const result = await functionUnderTest(input)

    // Assert
    expect(result).toBe(expected)
    expect(mockDependency).toHaveBeenCalledWith(expectedArgs)
  })
})
```

### 主进程 Stores 层

| 测试文件                     | 测试目标                | Mock 策略                |
| ---------------------------- | ----------------------- | ------------------------ |
| `app-config-store.test.ts`   | 配置获取/保存/合并      | 内存 electron-store mock |
| `agent-config-store.test.ts` | Agent 配置 CRUD         | 内存 electron-store mock |
| `conversation-store.test.ts` | 对话创建/追加/ID 生成   | memfs 虚拟文件系统       |
| `product-store.test.ts`      | 商品 CRUD + schema 校验 | memfs                    |

### 主进程 Browser 层

| 测试文件          | 测试目标                   | Mock 策略               |
| ----------------- | -------------------------- | ----------------------- |
| `browser.test.ts` | 窗口创建/URL 处理/消息发送 | `__mocks__/electron.ts` |

## 渲染进程测试（待建设）

**建议方案：**

```bash
# 安装依赖
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
```

**vitest 配置扩展：**

```typescript
// vitest.config.ts 增加 renderer 测试
test: {
  include: [
    'src/main/**/*.test.ts',
    'src/renderer/**/*.test.{ts,tsx}'
  ],
  // renderer 测试需要 jsdom 环境
  environment: (testPath.includes('renderer') ? 'jsdom' : 'node')
}
```

**测试重点：**

- 组件渲染（`@testing-library/react`）
- 用户交互（表单提交、按钮点击）
- Electron API 调用的 mock 和验证
- Toast 通知触发

## 注入层测试（待建设）

**挑战：** 注入层依赖 DOM 环境和 `window.__electronIPC` 全局对象。

**建议方案：**

1. 使用 `jsdom` 模拟浏览器环境
2. Mock `window.__electronIPC` 对象
3. 测试 DOM 提取函数（需要构造 HTML fixture）
4. 测试状态机流转逻辑（UnreadProcessor）

## 集成测试（待规划）

暂不实现。后续可考虑：

- **IPC 集成测试**：验证 preload → main 完整链路
- **Agent 端到端测试**：模拟消息输入到回复输出的完整流程
- **Store 持久化测试**：验证 electron-store 的实际读写行为

## 相关文档

- [主进程架构](./main-process.md)
- [桥接层架构](./bridge-layer.md)
- [渲染进程架构](./renderer-process.md)
