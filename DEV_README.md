# electron-xianyu-kefu - 开发者文档

## 技术栈

| 类别     | 技术                | 版本                 |
| -------- | ------------------- | -------------------- |
| 框架     | Electron            | ^39.2.6              |
| 构建工具 | electron-vite       | ^5.0.0               |
| 语言     | TypeScript          | ^5.9.3               |
| 前端     | React               | ^19.2.1              |
| 路由     | react-router-dom    | ^7.13.2              |
| 存储     | electron-store      | 10.1.0               |
| 校验     | zod                 | ^4.3.6               |
| LLM SDK  | openai              | ^6.33.0              |
| 日志     | consola             | ^3.4.2               |
| 测试     | Vitest              | ^4.1.2               |
| 覆盖率   | @vitest/coverage-v8 | 4.1.2                |
| E2E      | Playwright          | ^1.59.1              |
| 打包     | esbuild             | (electron-vite 内置) |
| 代码检查 | ESLint              | ^9.39.1              |
| 格式化   | Prettier            | ^3.7.4               |

## 目录结构

```
src/
├── shared/                         # 跨进程共用类型与默认配置
│   ├── types.ts                    # IpcResult<T>、AppConfig、Product、AgentKey…
│   └── defaults/                   # 默认配置（首次运行加载到 electron-store）
│       ├── configs/app-config.json
│       ├── prompts/{system,classify,default,price,tech}.json
│       └── products/001.json
│
├── main/                           # 主进程 (Node.js)
│   ├── index.ts                    # 入口：注册 IPC + 创建窗口 + 生命周期
│   ├── browser.ts                  # 窗口工厂 + 闲鱼浏览器窗口 + sendToBrowser()
│   ├── ipc-handlers.ts             # 所有 ipcMain.handle() 注册点
│   ├── stores/                     # 数据持久化（全部 electron-store）
│   │   ├── app-config-store.ts
│   │   ├── agent-config-store.ts
│   │   ├── conversation-store.ts
│   │   ├── product-store.ts
│   │   ├── document-store.ts
│   │   ├── reply-queue.ts
│   │   └── helper.ts
│   └── business/                   # 业务逻辑（纯函数可测试）
│       ├── agent.ts                # 编排器
│       ├── agent-runner.ts         # LLM 执行引擎
│       ├── intent-router.ts        # 意图分类
│       └── safety-filter.ts        # 安全过滤
│
├── injected/                       # 注入脚本（esbuild IIFE → 浏览器环境）
│   ├── types.ts
│   ├── im-dom-extractor.ts         # IM DOM 提取
│   ├── im-robot.ts                 # IM 自动化机器人（状态机）
│   ├── product-collector.ts        # 商品页面收集器
│   ├── __tests__/
│   └── index.ts                    # 统一入口：页面路由分发
│
├── preload/                        # 预加载脚本（contextBridge 桥接）
│   ├── index.ts                    # 主窗口 → window.electron API
│   ├── preload-browser.ts          # 浏览器窗口 → window.electronAPI
│   └── index.d.ts
│
└── renderer/src/                   # 渲染进程 (React SPA)
    ├── App.tsx                     # 路由 + 布局
    ├── main.tsx
    ├── pages/                      # 页面组件
    │   ├── ConfigsPage.tsx
    │   ├── AgentConfigPage.tsx
    │   ├── ProductsPage.tsx
    │   ├── DocumentsPage.tsx
    │   └── ConversationsPage.tsx
    ├── components/                 # 通用组件
    │   ├── Sidebar.tsx
    │   ├── AppHeader.tsx
    │   ├── ConfigForm.tsx
    │   ├── ProductEditor.tsx
    │   └── ConversationComponents/
    └── contexts/
        ├── ToastContext.tsx
        └── AgentContext.tsx
```

## 相关文档

### 架构文档

- [主进程架构](docs/architecture/main-process.md) — 业务流水线、Store 层、IPC handler、zod 校验规范
- [桥接层架构](docs/architecture/bridge-layer.md) — preload 注入方案、esbuild IIFE 编译、IPC 客户端
- [渲染进程架构](docs/architecture/renderer-process.md) — React 路由、UI 布局、状态管理、CSS 设计系统
- [IPC 通道文档](docs/architecture/ipc-channels.md) — 全部通道表（方向/请求类型/响应类型/说明）
- [测试方案](docs/architecture/testing.md) — mock 策略、各层测试规范

### 业务模块文档

- [应用配置](docs/modules/app-config.md) — LLM 参数、浏览器 URL、安全过滤、接管关键词
- [Agent 配置](docs/modules/agent-config.md) — 5 个 Agent 的提示词和推理参数
- [对话历史](docs/modules/conversation-store.md) — 消息采集、存储、AI 回复追加、历史查看
- [商品目录](docs/modules/product-store.md) — DOM 采集、持久化、Agent 商品上下文注入
- [回复队列](docs/modules/reply-queue.md) — AI 回复入队/出队、注入层轮询发送
- [注入脚本](docs/modules/injected-bundles.md) — esbuild IIFE 编译、页面路由分发、DOM 辅助函数

## 开发脚本

```bash
# 安装依赖
pnpm install

# 开发模式（含注入脚本构建 + 热重载）
pnpm dev

# 代码检查
pnpm lint              # ESLint 检查
pnpm typecheck         # TypeScript 类型检查（node + web）
pnpm format            # Prettier 格式化

# 测试
pnpm test              # 运行测试
pnpm test:watch        # 监听模式
pnpm test:coverage     # 覆盖率报告

# 构建
pnpm build             # 完整构建（typecheck + injected + electron-vite build）
pnpm build:injected    # 仅构建注入脚本（esbuild IIFE）
pnpm build:mac         # macOS 构建
pnpm build:win         # Windows 构建
pnpm build:linux       # Linux 构建
```

## 架构说明

三进程架构：

```
┌─────────────┐     contextBridge      ┌─────────────┐     IPC bridge      ┌─────────────┐
│   渲染进程    │ ◄── preload/index.ts ──►│   主进程     │ ◄── preload-browser ──►│  注入脚本    │
│   React SPA  │                        │   Node.js   │                       │  闲鱼页面    │
│   window.electron                      │   ipc-handlers                       │  DOM 操作    │
└─────────────┘                        └─────────────┘                       └─────────────┘
```

- **渲染进程**：React SPA，负责 UI 展示和用户交互
- **主进程**：Node.js 环境，负责业务编排、数据持久化、IPC 路由
- **注入脚本**：通过 esbuild 打包为 IIFE，注入到闲鱼浏览器页面中执行 DOM 操作

## 测试

- **框架**：Vitest 4.1.2
- **Mock 策略**：electron-store 通过 `mock-electron-store.ts` 统一 mock
- **覆盖范围**：main/business（agent、agent-runner、intent-router、safety-filter）、main/stores、injected（im-dom-extractor、product-collector）
- **运行方式**：`pnpm test` 或 `pnpm test:watch`

## 构建与发布

1. 运行 `pnpm build` 完成完整构建
2. 使用 `pnpm build:mac/win/linux` 打包对应平台安装包
3. 构建产物位于 `dist/` 目录

## 命名规范

- **目录与模块**：使用完整英文单词，禁止缩写（`business` 非 `biz`）
- **IPC 通道**：`{domain}:{action}` 格式（如 `config:save`、`product:getById`）
- **Store 函数**：`getXxx()` / `saveXxx()` / `deleteXxx()` 函数式导出

## 日志规范

所有日志输出必须使用 `consola.withTag('ModuleName')` 标记来源模块：

```ts
import { consola } from 'consola'

// ✅ 正确：标明模块来源
const logger = consola.withTag('main:agent')
logger.info('消息处理完成')

// ❌ 错误：直接使用全局打印
consola.info('消息处理完成')
```
