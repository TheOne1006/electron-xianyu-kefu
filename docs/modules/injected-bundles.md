# Module: Injected Bundles

> 注入脚本 — 单 bundle 架构，esbuild IIFE 编译，运行在闲鱼浏览器环境中

## 概述

`src/injected/` 目录包含所有注入到闲鱼浏览器页面的脚本代码。通过 esbuild 编译为单个 IIFE bundle（`resources/injected.bundle.js`），由 `preload-browser.ts` 在 DOMContentLoaded 时注入。

**重构前**：8 文件 / 3 子目录（`ipc/`、`message-handler/`、`im-helpers/`）→ 双 bundle
**重构后**：5 文件扁平结构 → 单 bundle

## 文件结构

| 文件                   | 行数 | 职责                                             |
| ---------------------- | ---- | ------------------------------------------------ |
| `types.ts`             | 23   | 注入脚本内部类型（ChatListItem、AgentState）     |
| `im-dom-extractor.ts`  | 271  | IM 页面 DOM 提取静态类（4 个静态方法）           |
| `im-robot.ts`          | 309  | IM 自动化机器人（状态机：10s 轮询 + 回复发送）   |
| `product-collector.ts` | 180  | 商品页面收集器（浮动按钮 + DOM 提取 + IPC 发送） |
| `index.ts`             | 30   | 统一入口：URL 路由分发                           |
| `__tests__/`           | —    | 单元测试（im-dom-extractor、product-collector）  |

## 构建配置

单个 esbuild 命令编译所有注入脚本：

```bash
esbuild src/injected/index.ts \
  --bundle \
  --format=iife \                 # 立即执行函数
  --global-name=InjectedScript \  # window.InjectedScript
  --outfile=resources/injected.bundle.js \
  --platform=browser \            # 浏览器环境
  --external:fs \                 # 排除 Node 模块
  --external:path
```

构建命令：`pnpm build:injected`

## 注入流程

```
用户点击「启动浏览器」
        │
        ▼
┌─ main/browser.ts ──────────────────────────────────────────┐
│  createBrowserWindow(config)                                 │
│  preload: preload-browser.js                                 │
│  loadURL(config.browserUrl)  → goofish.com                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ DOMContentLoaded
┌─ preload-browser.ts ─▼─────────────────────────────────────┐
│  1. contextBridge.exposeInMainWorld('electronAPI', {         │
│       simulateClick, simulateChineseInput, simulateEnterKey, │
│       replyQueue, conversation, product                      │
│     })                                                      │
│  2. loadInjectedCode()  ← injected-inject.ts                 │
│     → 读取 resources/injected.bundle.js                      │
│  3. webContents.executeJavaScript(code)                      │
└──────────────────────────────────────────────────────────────┘
```

## ImDomExtractor

IM 页面 DOM 提取静态工具类，不挂载到 `window`，由 `ImRobot` 按需调用。

### 静态方法

| 方法                   | 返回类型         | 说明                                                     |
| ---------------------- | ---------------- | -------------------------------------------------------- |
| `getCurrentChatInfo()` | `ChatInfo`       | 提取当前聊天对象信息（用户名、itemId、isMyProduct）      |
| `hasUnreadMessages()`  | `boolean`        | 通过 badge 元素检测是否有未读消息                        |
| `getChatMessages()`    | `ChatMessage[]`  | 解析消息列表，支持文本/图片/卡片三种类型                 |
| `getChatList()`        | `ChatListItem[]` | 抓取左侧会话列表，含用户名、未读标记、商品图片、DOM 引用 |

### 消息方向判定

通过 avatar 元素在 flex 容器中的位置判断：

- 对方消息：avatar 是第一个子元素（`isSelf = false`）
- 我的消息：avatar 是最后一个子元素（`isSelf = true`）

### 会话类型判定

- **user**：有商品图片且无 `reminder` 标记
- **system**：无商品图片或有 `reminder` 标记

## ImRobot

IM 页面自动化机器人，状态机驱动，每 10 秒 tick 一次。

### 状态流转

```
         ┌────────────────────────────────────────────┐
         │                  IDLE                       │
         └─────────────────┬──────────────────────────┘
                           │ 检查待发送回复 / 未读消息
                           ▼
                    ┌─────────────┐
                    │  CHECKING   │
                    └──┬──────┬───┘
                       │      │
              有待发送  │      │ 有未读消息
              AI 回复   │      │
                       ▼      ▼
          ┌──────────────┐  ┌───────────────────┐
          │ PROCESSING   │  │ PROCESSING        │
          │ _REPLY       │  │ _COLLECT          │
          │ (发送回复)    │  │ (采集聊天数据)     │
          └──────┬───────┘  └────────┬──────────┘
                 │                   │
                 ▼                   ▼
                ┌────────────────────────┐
                │       CLEANUP          │
                │  (清理状态 → IDLE)      │
                └────────────────────────┘
```

### 回复发送流程（PROCESSING_REPLY）

```
拉取回复队列（reply-queue:dequeue）
      │
      ▼ 通过 chatId 获取对话数据（conversation:getById）
      │
      ▼ 通过 itemId + 商品图片前缀匹配定位会话项
      │
      ▼ likeHumanClick(matchedChat.dom)
      │    随机偏移的人类化点击（±30%水平/±20%垂直）
      │
      ▼ 等待 1500ms（页面切换）
      │
      ▼ 点击输入框（textarea.ant-input）获取焦点
      │
      ▼ 等待 1500ms
      │
      ▼ simulateChineseInput(replyText)（AI 回复文本）
      │
      ▼ 等待 2500ms
      │
      ▼ simulateEnterKey() 发送消息
      │
      ▼ CLEANUP → IDLE
```

### 未读采集流程（PROCESSING_COLLECT）

```
检测到未读消息（hasUnreadMessages）
      │
      ▼ 获取会话列表（getChatList）
      │
      ▼ 找到第一个未读会话
      │
      ├── 系统消息（无商品图/reminder标记）
      │     └── likeHumanClick(dom) → 清除标记 → CLEANUP
      │
      └── 用户消息
            │
            ▼ likeHumanClick(dom) → 进入聊天
            │
            ▼ 等待 1500ms
            │
            ▼ ImDomExtractor.getCurrentChatInfo()
            │ ImDomExtractor.getChatMessages()
            │
            ▼ IPC conversation:upsert → 主进程处理
            │
            ▼ CLEANUP → IDLE
```

### 会话匹配逻辑

通过商品缩略图 URL 前缀匹配关联会话与回复目标：

1. 在 products 列表中按 `itemId` 找到目标商品
2. 取商品 `mainImageUrl` 前 72 字符作为匹配前缀
3. 在 chatList 中查找 `itemImage` 以该前缀开头的会话项

## ProductCollector

商品页面收集器，在 `/item` 页面运行。

### 功能

1. **浮动按钮**：页面右下角显示「📦 收集产品」按钮
2. **DOM 提取**：`extractProduct()` 从页面提取商品信息
3. **IPC 发送**：通过 `electronAPI.product.upsert()` 发送到主进程

### extractProduct() 提取逻辑

| 字段           | 提取方式                                                      |
| -------------- | ------------------------------------------------------------- |
| `id`           | URL 参数 `id`                                                 |
| `title`        | desc 元素 innerHTML 第一行（处理 `<br/>` 换行）               |
| `content`      | desc 元素完整文本内容                                         |
| `images`       | item-main-window-list-item 元素中的 img 标签（排除 data:URL） |
| `mainImageUrl` | 取 images 第一张                                              |

### 按钮状态流转

```
「📦 收集产品」→ 点击 →「⏳ 收集中...」
                          │
                          ├── 成功 →「✅ 已收集」
                          └── 失败 →「❌ 收集失败」（可重试）
```

## 路由分发

`index.ts` 根据当前页面路径启动对应处理器：

```
injected/index.ts 执行
        │
        ├── URL 匹配 /im
        │     └── new ImRobot().start()
        │           ├── 优先：拉取回复队列 → 发送 AI 回复
        │           └── 其次：检测未读消息 → 采集 → 推送主进程
        │
        ├── URL 匹配 /item
        │     └── new ProductCollector().start()
        │           └── 创建浮动按钮，等待用户点击收集
        │
        └── 其他页面
              └── 无操作
```

## 类型定义

### ChatListItem

会话列表中的每一项，用于 `ImRobot` 定位和操作会话：

| 字段           | 类型    | 说明                                    |
| -------------- | ------- | --------------------------------------- |
| `type`         | string  | 会话类型：`user` / `system` / `unknown` |
| `userName`     | string  | 对方用户名                              |
| `lastMessage`  | string  | 最后一条消息内容                        |
| `time`         | string  | 最后消息时间                            |
| `hasUnread`    | boolean | 是否有未读消息                          |
| `unreadCount`  | number  | 未读消息数量                            |
| `itemImage`    | string  | 商品缩略图 URL（用于会话匹配）          |
| `hasItemImage` | boolean | 是否有商品图片（区分系统/用户消息）     |
| `tradeStatus`  | string  | 交易状态                                |
| `dom`          | Element | 原始 DOM 元素引用（用于模拟点击）       |

### AgentState

状态机状态枚举：

```typescript
type AgentState = 'IDLE' | 'CHECKING' | 'PROCESSING_REPLY' | 'PROCESSING_COLLECT' | 'CLEANUP'
```

## 关键约束

- **独立编译**：`src/injected/` 不参与 electron-vite 主构建，需要单独 `pnpm build:injected`
- **单 bundle**：所有注入代码编译为 `resources/injected.bundle.js`，由 `preload-browser.ts` 统一注入
- **IIFE 格式**：bundle 以立即执行函数方式运行，不污染全局作用域
- **浏览器平台**：所有代码运行在 Chromium 渲染环境，无 Node.js API（`fs`/`path` 被 external 排除）
- **IPC 通信**：通过 `window.electronAPI` 调用主进程 IPC，由 `preload-browser.ts` 的 `contextBridge` 建立
- **CSS 选择器脆弱性**：DOM 提取依赖 `[class*="xxx"]` 模糊匹配，闲鱼前端更新可能导致选择器失效
- **模拟人类操作**：点击使用随机偏移（±30%水平/±20%垂直）+ 随机延迟（500-1000ms）模拟真人行为
- **路径守卫**：路由分发由 `index.ts` 统一处理，各模块无需自行校验 URL
