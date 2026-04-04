# 渲染进程架构 (Renderer Process)

> 技术栈：React 19.2.1 + React Router 7.13.2 + TypeScript + CSS Variables

## 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│  App.tsx                                                      │
│  ┌─────────┐  ┌──────────────────────────────────────────┐   │
│  │         │  │  <Outlet /> — 页面内容                     │   │
│  │ Sidebar │  │  ┌──────────┬──────────────────────────┐  │   │
│  │         │  │  │ Header   │  "启动浏览器" 按钮         │  │   │
│  │ ──────  │  │  ├──────────┴──────────────────────────┤  │   │
│  │ 配置    │  │  │                                      │  │   │
│  │ Agent  │  │  │   Page Component                     │  │   │
│  │ 商品    │  │  │   (ConfigsPage / AgentConfigPage /  │  │   │
│  │         │  │  │    ProductsPage)                    │  │   │
│  │ ──────  │  │  │                                      │  │   │
│  │ ◀ ▶    │  │  └──────────────────────────────────────┘  │   │
│  └─────────┘  └──────────────────────────────────────────┘   │
│                                                                │
│  ┌───────────────────  ToastContainer (Portal)  ────────────┐ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## 路由结构

```
/              → 重定向到 /configs
/settings      → 重定向到 /configs
/configs      → ConfigsPage      — LLM + 浏览器 + 安全过滤配置
/agent-config → AgentConfigPage  — 5 个 Agent 完整配置（prompt + temperature + maxTokens）
/products     → ProductsPage     — 商品目录管理（CRUD + 文档关联）
/documents    → DocumentsPage    — 文档库管理（CRUD）
/conversations → ConversationsPage — 对话历史查看
```

## UI 布局

### Sidebar（可折叠导航）

- 展开宽度 200px / 收起 64px，状态持久化到 `localStorage`
- 当前路由高亮（左侧色条指示）
- 底部折叠/展开按钮

### 页面布局模式

**单栏页面**（ConfigsPage、AgentConfigPage）：

```
┌──────────────────────────────────┐
│           max-width 容器          │
│         (ConfigForm / AgentCard)   │
└──────────────────────────────────┘
```

**表格页面**（ProductsPage、DocumentsPage）：

```
┌──────────────────────────────────┐
│  [+ 新增产品]                     │
├──────────────────────────────────┤
│  商品表格（ID / 标题 / 主图 / 操作）│
│  弹窗表单：编辑/新增统一 ProductModal│
└──────────────────────────────────┘
```

## 状态管理

**无全局状态库**，使用 React 内置机制：

| 场景         | 方案                                  |
| ------------ | ------------------------------------- |
| 页面局部状态 | `useState`                            |
| 跨组件通知   | `ToastContext`（`useToast` hook）     |
| 数据加载     | `useEffect` + `window.electron.xxx()` |
| 性能优化     | `useCallback` 缓存事件处理器          |

**数据流模式：**

```
Component mount → useEffect 加载 Electron API 数据 → setState
User action → setState → 调用 Electron API → showToast 反馈
```

## 与主进程通信

通过 `window.electron` API（preload 暴露），所有调用返回 `Promise`：

| API 命名空间   | 主要操作                                          |
| -------------- | ------------------------------------------------- |
| `config`       | 获取/保存应用配置                                 |
| `browser`      | 启动浏览器窗口                                    |
| `agentConfig`  | 获取/更新 Agent 配置（all / upsert）              |
| `conversation` | 对话列表/详情/创建更新                            |
| `replyQueue`   | 回复队列 peek / dequeue / enqueue                 |
| `product`      | 商品 CRUD（upsert / deleteById / list / getById） |
| `document`     | 文档 CRUD（all / get / upsert / delete）          |

## CSS 设计系统

使用 CSS Variables 实现主题一致性：

```css
/* 背景层级 */
--bg-base → --bg-surface → --bg-elevated

/* 文字层级 */
--text-primary → --text-secondary → --text-disabled

/* 语义色 */
--color-success / --color-danger / --color-warning

/* 间距/圆角/动画 */
--space-* / --radius-* / --duration-fast / --ease-default
```

**通用样式类**（`main.css`）：`.card`、`.btn` / `.btn-primary`、`.input-field`、`.badge-*`、`.divider`

## 组件清单

### 布局组件

| 组件      | 文件                       | 说明                      |
| --------- | -------------------------- | ------------------------- |
| Sidebar   | `components/Sidebar.tsx`   | 可折叠导航栏              |
| AppHeader | `components/AppHeader.tsx` | 页面标题 + 启动浏览器按钮 |

### 表单组件

| 组件          | 文件                           | 说明                          |
| ------------- | ------------------------------ | ----------------------------- |
| ConfigForm    | `components/ConfigForm.tsx`    | LLM + 安全过滤配置表单        |
| ProductEditor | `components/ProductEditor.tsx` | JSON 编辑器（旧版，逐步弃用） |

### 页面组件

| 页面               | 文件                              | 说明                            |
| ------------------ | --------------------------------- | ------------------------------- |
| ConfigsPage        | `pages/ConfigsPage.tsx`           | 应用配置页                      |
| AgentConfigPage    | `pages/AgentConfigPage.tsx`       | Agent 配置页（5 个 Agent 卡片） |
| ProductsPage       | `pages/ProductsPage.tsx`          | 商品管理页（统一弹窗表单）      |
| DocumentsPage      | `pages/DocumentsPage.tsx`         | 文档库管理页                    |
| ConversationsPage  | `pages/ConversationsPage.tsx`     | 对话历史页                      |

### 上下文

| Context      | 文件                        | 说明                                       |
| ------------ | --------------------------- | ------------------------------------------ |
| ToastContext | `contexts/ToastContext.tsx` | Toast 通知（success/error/info，自动消失） |

## React 模式规范

- **纯函数组件**，不使用 class component
- **Hooks**: `useState` / `useEffect` / `useCallback` / `useContext` / `useRef`
- **受控组件**：所有表单使用受控输入
- **复合组件**：模态框内联在同一文件中
- **Loading/Error/Empty 三态**：每个数据页面处理完整状态

## 相关文档

- [IPC 通道详细文档](./ipc-channels.md)
- [测试方案](./testing.md)
