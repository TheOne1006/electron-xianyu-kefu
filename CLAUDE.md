# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言要求 / Language Requirements

- **必须使用中文输出 / Must use Chinese for output**
- 所有代码注释、提交信息、文档说明均使用中文
- 与用户交流必须使用中文

## 项目目标 / Project Goals

1. **闲鱼客服自动化** — 通过 AI 助手自动处理客户咨询
2. **闲鱼 Web 接口解析与逆向** — 分析和逆向闲鱼网页的 API 接口
3. **构建可扩展的客服工具平台**

## 技术栈 / Tech Stack

- **Framework**: Electron + electron-vite
- **语言**: TypeScript
- **前端**: React + React Router
- **日志**: consola
- **存储**: electron-store（全部持久化）
- **校验**: zod（JSON schema 校验）
- **构建**: esbuild（注入脚本 IIFE）+ Vite（主应用）
- **测试**: Vitest

## 核心目录 / Directory Structure

```text
src/
├── shared/
│   ├── types.ts                    # 跨进程共用类型（IpcResult<T>、AppConfig、Product、AgentKey…）
│   ├── log-reporter.ts             # 共享 IPC log reporter（renderer/injected 通过 ipcRenderer.send 发送日志）
│   └── defaults/                   # 默认配置（首次运行加载到 electron-store）
│       ├── configs/app-config.json
│       ├── prompts/{system,classify,default,price,tech}.json
│       └── products/001.json
│
├── main/                           # 主进程 (Node.js)
│   ├── index.ts                    # 入口：注册 IPC + 创建窗口 + 生命周期
│   ├── browser.ts                  # 窗口工厂 + 闲鱼浏览器窗口 + sendToBrowser()
│   ├── setup-consola.ts            # 主进程 consola 配置（注册 LogCollector）
│   ├── ipc/                        # IPC handler 模块化（按领域拆分）
│   │   ├── core-handlers.ts        # config / xy-browser 通道
│   │   ├── agent-config-handlers.ts
│   │   ├── conversation-handlers.ts
│   │   ├── product-handlers.ts
│   │   ├── document-handlers.ts
│   │   ├── reply-queue-handlers.ts
│   │   ├── log-handlers.ts         # log:request/clear/history/listDates
│   │   ├── data-handlers.ts        # data:export/import/openDir
│   │   ├── automation-handlers.ts
│   │   └── safe-handle.ts          # ipcMain.handle 包装器（异常兜底）
│   ├── log/                        # 日志系统
│   │   ├── log-collector.ts        # 日志收集器（接收 IPC 日志，分发给 writer 和 UI）
│   │   └── file-writer.ts          # 日志文件写入器（按日期轮转）
│   ├── stores/                     # 数据持久化（全部 electron-store，统一 app-data/ 目录）
│   │   ├── app-config-store.ts     # AppConfig（LLM、浏览器 URL、安全过滤）
│   │   ├── agent-config-store.ts   # Record<AgentKey, AgentConfig>（5 Agent 的 prompt+参数）
│   │   ├── conversation-store.ts   # 对话历史（按 chatId 存储）
│   │   ├── product-store.ts        # 商品目录（Product[]）
│   │   ├── document-store.ts       # 文档库（Record<title, content>）
│   │   ├── reply-queue.ts          # 待发送回复队列（入队/出队/幂等）
│   │   └── helper.ts               # Store 共用工具函数（getStoreCwd、safeId）
│   └── business/                   # 业务逻辑（无 Electron 依赖，纯函数可测试）
│       ├── agent.ts                # 编排器：消息过滤 → 意图分类 → LLM 回复 → 入队
│       ├── agent-runner.ts         # LLM 执行引擎：构建 prompt → OpenAI API → 安全过滤
│       ├── intent-router.ts        # 意图分类：关键词/regex 快速路径 + LLM 兜底
│       ├── safety-filter.ts        # 关键词替换式安全过滤
│       └── payment-handler.ts      # 支付事件处理（自动发货 / Webhook 通知）
│
├── injected/                       # 注入脚本（esbuild IIFE → 浏览器环境）
│   ├── types.ts                    # 注入脚本内部类型（ChatListItem、AgentState）
│   ├── im-dom-extractor.ts         # IM DOM 提取静态类（getCurrentChatInfo/getChatMessages/…）
│   ├── im-robot.ts                 # IM 自动化机器人（状态机：10s 轮询 + 回复发送）
│   ├── product-collector.ts        # 商品页面收集器（浮动按钮 + DOM 提取）
│   ├── __tests__/                  # 单元测试（im-dom-extractor、product-collector）
│   └── index.ts                    # 统一入口：页面路由分发
│
├── preload/                        # 预加载脚本（contextBridge 桥接）
│   ├── index.ts                    # 主窗口 → window.electron API（config/browser/prompts/chat/products/documents）
│   ├── preload-browser.ts          # 浏览器窗口 → window.electronAPI + bundle 注入
│   └── index.d.ts                  # 类型声明
│
└── renderer/src/                   # 渲染进程 (React SPA)
    ├── App.tsx                     # 路由 + 布局（Sidebar + Header + Outlet）
    ├── main.tsx                    # React 入口
    ├── env.d.ts                    # Vite 类型声明
    ├── pages/                      # 页面组件
    │   ├── ConfigsPage.tsx         # /configs — LLM + 浏览器配置 + 数据管理
    │   ├── AgentConfigPage.tsx     # /agent-config — 5 Agent 提示词编辑
    │   ├── ProductsPage.tsx        # /products — 商品 CRUD（统一弹窗表单）
    │   ├── DocumentsPage.tsx       # /documents — 文档库管理
    │   ├── ConversationsPage.tsx   # /conversations — 对话历史
    │   ├── LogsPage.tsx            # /logs — 日志查看（按日期 + 实时）
    │   ├── QuickStartPage.tsx      # /quick-start — 快速入门引导
    │   └── QAndAPage.tsx           # /qa — 常见问题解答
    ├── components/                 # 通用组件
    │   ├── Sidebar.tsx             # 可折叠导航栏
    │   ├── AppHeader.tsx           # 页面标题 + 启动浏览器按钮
    │   ├── ConfigForm.tsx          # LLM + 安全过滤配置表单
    │   ├── ProductEditor.tsx       # JSON 编辑器
    │   ├── Versions.tsx            # 版本号显示
    │   └── ConversationComponents/ # 对话页面子组件
    │       ├── SessionList.tsx     # 会话列表
    │       ├── MessageList.tsx     # 消息列表
    │       └── Input.tsx           # 输入框
    └── contexts/                   # React 上下文
        ├── ToastContext.tsx        # Toast 通知（success/error/info，自动消失）
        └── AgentContext.tsx        # Agent 状态上下文
```

## 业务逻辑流程 / Business Flows

### 1. 自动回复流程（核心链路）

```text
闲鱼用户发消息
      │
      ▼
┌─ injected/im-robot.ts ───────────────────────────────────────┐
│  (10s 轮询状态机)                                               │
│                                                                 │
│  检测到未读 → 提取聊天数据（ImDomExtractor DOM 抓取）              │
│      │                                                          │
│      ▼ IPC: conversation:upsert                                 │
└──────┼──────────────────────────────────────────────────────────┘
       │
┌──────▼─────── main/business/agent.ts ────────────────────────┐
│  1. 过滤：仅处理「用户发送的文本消息」（isSelf=false, type=text）  │
│  2. 记录：conversation-store 创建/更新对话                      │
│  3. 关联：product-store 查询商品信息（by itemId）                │
│  4. 分类：intent-router → 关键词快路径 或 LLM 分类               │
│  5. 生成：agent-runner → 构建 prompt → OpenAI API → 安全过滤    │
│  6. 入队：reply-queue.enqueue(chatId, replyText)                │
└──────┼─────────────────────────────────────────────────────────┘
       │
┌──────▼─────── injected（下一轮轮询）──────────────────────────┐
│  IPC: reply-queue:peek → 拉取回复                               │
│      │                                                          │
│      ▼                                                          │
│  导航到聊天 → 填入 AI 文本 → 点击发送                            │
│      │                                                          │
│      ▼ IPC: reply-queue:dequeue → 出队                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 商品采集流程

```text
用户浏览闲鱼商品页 (/item)
      │
      ▼
┌─ injected/product-collector.ts ────────────────────────┐
│  点击「📦 收集产品」按钮                                │
│      │                                                 │
│      ▼                                                 │
│  extractProduct()  ← DOM 抓取                          │
│  （提取 ID/标题/图片/描述/价格）                         │
│      │                                                 │
│      ▼ IPC: product:upsert                             │
└──────┼─────────────────────────────────────────────────┘
       │
┌──────▼─────── main/stores/product-store.ts ───────────┐
│  electron-store 持久化 → 返回 IpcResult<Product>       │
└───────────────────────────────────────────────────────┘
```

### 3. 配置管理流程

```text
renderer/ConfigsPage → window.electron.config.save(partial)
      │
      ▼
preload/index.ts → ipcRenderer.invoke('config:save', partial)
      │
      ▼
main/ipc-handlers.ts → app-config-store.saveAppConfig() → electron-store 浅合并
```

## 三进程架构 / Three-Process Architecture

```text
┌─────────────┐     contextBridge      ┌─────────────┐     IPC bridge      ┌─────────────┐
│   渲染进程    │ ◄── preload/index.ts ──►│   主进程     │ ◄── preload-browser ──►│  注入脚本    │
│   React SPA  │                        │   Node.js   │                       │  闲鱼页面    │
│   window.electron                      │   ipc-handlers                       │  DOM 操作    │
└─────────────┘                        └─────────────┘                       └─────────────┘
```

**架构文档（详见 docs/architecture/）：**

| 文档                                                         | 说明                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [main-process.md](docs/architecture/main-process.md)         | 主进程架构 — 业务流水线、Store 层、IPC handler、zod 校验规范 |
| [bridge-layer.md](docs/architecture/bridge-layer.md)         | 桥接层架构 — preload 注入方案、esbuild IIFE 编译、IPC 客户端 |
| [renderer-process.md](docs/architecture/renderer-process.md) | 渲染进程架构 — React 路由、UI 布局、状态管理、CSS 设计系统   |
| [ipc-channels.md](docs/architecture/ipc-channels.md)         | IPC 通道详细文档 — 全部通道表（方向/请求类型/响应类型/说明） |
| [testing.md](docs/architecture/testing.md)                   | 测试方案 — mock 策略、各层测试规范、待建设方向               |

**业务模块文档（详见 docs/modules/）— 跨层视角，每个模块贯穿 main / preload / renderer / injected：**

| 模块                                                        | 说明                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| [app-config.md](docs/modules/app-config.md)                 | 应用配置 — LLM 参数、浏览器 URL、安全过滤、接管关键词    |
| [agent-config.md](docs/modules/agent-config.md)             | Agent 配置 — 5 个 Agent 的提示词和推理参数               |
| [conversation-store.md](docs/modules/conversation-store.md) | 对话历史 — 消息采集、存储、AI 回复追加、历史查看         |
| [product-store.md](docs/modules/product-store.md)           | 商品目录 — DOM 采集、持久化、Agent 商品上下文注入        |
| [reply-queue.md](docs/modules/reply-queue.md)               | 回复队列 — AI 回复入队/出队、注入层轮询发送              |
| [injected-bundles.md](docs/modules/injected-bundles.md)     | 注入脚本 — esbuild IIFE 编译、页面路由分发、DOM 辅助函数 |

## 常用命令 / Common Commands

```bash
pnpm install           # 安装依赖
pnpm dev               # 开发模式（含注入脚本构建）
pnpm build             # 完整构建
pnpm build:injected    # 构建注入脚本（单 bundle：src/injected/index.ts → resources/injected.bundle.js）
pnpm build:mac         # 构建 macOS
pnpm lint              # ESLint 检查
pnpm typecheck         # TypeScript 类型检查
pnpm test              # 运行测试
pnpm test:watch        # 监听模式
pnpm test:coverage     # 覆盖率报告
```

## 命名规范 / Naming Conventions

- **目录与模块**: 使用完整英文单词，禁止缩写（`business` 非 `biz`，`products` 非 `prod`）
- **IPC 通道**: `{domain}:{action}` 格式，多词操作 camelCase（`getById`、`createOrUpdate`）
- **Store 函数**: `getXxx()` / `saveXxx()` / `deleteXxx()` 函数式导出
- **业务编排模块**: `BusinessAgent`（不是 `BizAgent`）

## 日志规范 / Logging Conventions

- **使用 withTag / Use withTag**: 所有日志输出必须使用 `consola.withTag('ModuleName')` 标记来源模块，然后再执行具体的打印方法。
- **示例 / Example**:

```ts
import { consola } from 'consola'

// ❌ 错误：直接使用全局打印
consola.info('Server started')

// ✅ 正确：标明模块来源
const logger = consola.withTag('main:server')
logger.info('Server started')
```

## 任务收尾规范 / Task Completion Rules

- **lint 检测**: 主进程中完成任何修改后（非 subagent 任务），必须执行 `pnpm lint`
- 任务完成 = 代码修改 → lint 检测通过 → git commit
- **注入脚本修改**: `src/injected/` 下修改后需运行 `pnpm build:injected` 重新构建
