# 桥接层架构 (Preload + Injected)

> 技术栈：contextBridge + esbuild IIFE

## 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                    闲鱼浏览器窗口 (Chromium)                       │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  浏览器页面 (goofish.com)                    │  │
│  │                                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │  injected.bundle.js                                  │   │  │
│  │  │  (ImRobot 状态机 + ProductCollector + ImDomExtractor) │   │  │
│  │  └────────────────────────┬────────────────────────────┘   │  │
│  │                           │                                 │  │
│  │                           ▼                                 │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  window.electronAPI                                   │   │  │
│  │  │  invoke(channel, data) → Promise<IpcResult<T>>       │   │  │
│  │  └──────────────────────┬───────────────────────────────┘   │  │
│  └─────────────────────────┼──────────────────────────────────┘  │
│                             │                                      │
│  ┌──────────────────────────┼──────────────────────────────────┐ │
│  │  preload-browser.ts      │  (contextBridge 隔离层)           │ │
│  │  ipcRenderer.invoke() ◄──┘                                  │ │
│  │  injected-inject.ts → 加载 injected.bundle.js               │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────────┘
                               │ IPC (Electron 内部通信)
                               ▼
                        ┌──────────────┐
                        │  主进程       │
                        │ ipc-handlers │
                        └──────────────┘
```

## Preload 层

### 主窗口 preload (`preload/index.ts`)

向渲染进程暴露结构化 API，每个命名空间对应一类 IPC 操作：

```typescript
window.electron = {
  config:   { get, save },
  browser:  { launch },
  prompts:  { list, getById, add, updateById, delete },
  chat:     { list, getById, add, updateById, delete, sendReply },
  products: { list, getById, add, delete }
}
```

所有调用使用 `ipcRenderer.invoke()` 双向模式。

### 浏览器窗口 preload (`preload/preload-browser.ts`)

通过 `contextBridge.exposeInMainWorld('electronAPI', {...})` 暴露 IPC 桥接：

```typescript
window.electronAPI = {
  simulateClick: (x, y) => ipcRenderer.invoke('simulate:click', x, y),
  simulateChineseInput: (text) => ipcRenderer.invoke('simulate:chinese-input', text),
  simulateEnterKey: (x, y) => ipcRenderer.invoke('simulate:enter-key', { x, y }),
  replyQueue: { dequeue: () => ipcRenderer.invoke('reply-queue:dequeue') },
  conversation: {
    upsert: (chatInfo, messages) => ipcRenderer.invoke('conversation:upsert', { chatInfo, messages }),
    getById: (chatId) => ipcRenderer.invoke('conversation:getById', { chatId })
  },
  product: {
    upsert: (product) => ipcRenderer.invoke('product:upsert', product),
    list: () => ipcRenderer.invoke('product:list')
  }
}
```

**注入流程**（DOMContentLoaded 时执行）：

```
1. 创建 electronAPI 桥接（contextBridge）
2. 注入 injected.bundle.js（单 bundle，含路由分发）
```

### 注入加载模块 (`preload/injected-inject.ts`)

读取 `resources/injected.bundle.js` 文件内容，供 `preload-browser.ts` 通过 `<script>` 标签注入：

```typescript
export function loadInjectedCode(): string {
  const filePath = join(__dirname, '../../resources/injected.bundle.js')
  return readFileSync(filePath, 'utf-8')
}
```

## Injected 层

### 文件结构

| 文件                        | 行数 | 职责                                           |
| --------------------------- | --- | ---------------------------------------------- |
| `types.ts`                  | 23  | 内部类型定义（ChatListItem、AgentState）         |
| `im-dom-extractor.ts`       | 271 | IM 页面 DOM 提取静态类（4 个静态方法）           |
| `im-robot.ts`               | 309 | IM 自动化机器人（状态机 + 回复发送）             |
| `product-collector.ts`      | 180 | 商品页面收集器（浮动按钮 + DOM 提取）            |
| `index.ts`                  | 30  | 统一入口：URL 路由分发                          |

### 构建方式

通过 esbuild 编译为单个 IIFE bundle：

```bash
esbuild src/injected/index.ts \
  --bundle --format=iife --global-name=InjectedScript \
  --outfile=resources/injected.bundle.js \
  --platform=browser --external:fs --external:path
```

### ImDomExtractor — DOM 辅助模块

纯静态类，不挂载到 `window`，由调用方按需使用。路由层（`index.ts`）保证只在 `/im` 页面执行。

| 静态方法                       | 返回类型         | 说明                           |
| ------------------------------ | ---------------- | ------------------------------ |
| `getCurrentChatInfo()`         | `ChatInfo`       | 提取当前聊天对象信息           |
| `hasUnreadMessages()`          | `boolean`        | 检测未读消息标记               |
| `getChatMessages()`            | `ChatMessage[]`  | 解析消息列表（文本/图片/卡片） |
| `getChatList()`                | `ChatListItem[]` | 抓取会话列表                   |

### ProductCollector — 商品收集模块

内联了原 `product-helpers` 的 DOM 提取逻辑，不再挂载 `window.collectProduct`。在 `/item` 页面创建浮动按钮，用户点击后通过 `extractProduct()` 从 DOM 提取商品数据，通过 IPC 发送到主进程。

## 消息流转全景

```
闲鱼页面                     Injected 层               主进程
─────────                    ──────────                ─────────
用户发消息 ─→ DOM 变化
             │
             ├─(10s 轮询)─→ ImRobot
                              │
                              ├─ 检查未读 ─→ 提取消息 ──→ IPC invoke ──→ agent.ts
                              │                                              │
                              │                                    ┌─────────┘
                              │                                    ├─ 意图分类
                              │                                    ├─ LLM 生成回复
                              │                                    ├─ 安全过滤
                              │                                    └─ 入队 (reply-queue)
                              │
                              ├─ 拉取回复 ←── IPC invoke ←── reply-queue:dequeue
                              │
                              └─ 填入回复 → 点击发送 → DOM 操作
                                               │
                                               └─ (dequeue 已在拉取时完成)
```

## 关键约束

1. **注入脚本修改后必须重新构建**：`pnpm build:injected`
2. **CSS 选择器脆弱性**：DOM helpers 使用 `[class*="xxx"]` 匹配，闲鱼前端更新可能导致失效
3. **contextBridge 限制**：只能传递可序列化数据，不能传递函数/类实例
4. **轮询间隔**：10 秒，在 `ImRobot` 中硬编码
5. **状态互斥**：状态机保证同一时间只处理一个消息，避免竞态
6. **IPC 通信**：注入脚本通过 `window.electronAPI` 与主进程通信，由 `preload-browser.ts` 的 `contextBridge` 建立

## 相关文档

- [IPC 通道详细文档](./ipc-channels.md)
- [测试方案](./testing.md)
- [注入脚本模块文档](../modules/injected-bundles.md)
