# Implementation Plan: 会话列表 UI 布局优化

**Branch**: `002-conversations-ui-polish` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-conversations-ui-polish/spec.md`

## Summary

将 ConversationsPage 从"列表/详情切换"模式重构为"左右并排常驻"布局。左侧会话列表始终可见（可拖拽调整宽度），右侧显示选中会话的聊天消息。同时优化会话卡片样式：消息条数紧跟用户名、添加商品主图缩略图、消息预览两行截断。

## Technical Context

**Language/Version**: TypeScript 5.9.3
**Primary Dependencies**: React 19.2.1, Electron 39.2.6, electron-vite 5.0.0
**Storage**: electron-store（已有 product-store / conversation-store）
**Testing**: Vitest 4.1.2
**Target Platform**: macOS (Electron 桌面应用)
**Project Type**: Desktop App (Electron + React SPA)
**Performance Goals**: 会话切换 <100ms，图片缩略图加载 <1s
**Constraints**: 不引入第三方拖拽库，纯 CSS/JS 实现分隔条拖拽
**Scale/Scope**: 单用户桌面应用，会话数量通常 <100 条

## Constitution Check

Constitution 为默认模板（未自定义），无 gate 约束。直接通过。

## Project Structure

### Documentation (this feature)

```text
specs/002-conversations-ui-polish/
├── plan.md              # 本文件
├── spec.md              # 功能规格
├── research.md          # 技术调研
├── data-model.md        # 数据模型
├── quickstart.md        # 快速开发指南
└── checklists/
    └── requirements.md  # 质量检查清单
```

### Source Code (repository root) — 变更范围

```text
src/renderer/src/
├── pages/
│   └── ConversationsPage.tsx        # 主要重构：双面板布局 + 商品数据加载
├── components/ConversationComponents/
│   ├── SessionList.tsx              # 会话卡片样式重构：对齐、主图、截断
│   ├── MessageList.tsx              # 无变更
│   └── Input.tsx                    # 无变更
└── components/
    └── ResizableSplit.tsx           # 新增：通用可拖拽分隔条组件
```

**Structure Decision**: 仅修改渲染层（renderer），不涉及主进程或注入脚本。新增一个通用 `ResizableSplit` 组件供布局使用。

## Phase 0: Research

### R1: Product 数据获取方式

**Decision**: 在 ConversationsPage 组件初始化时调用 `window.electron.product.list()` 获取全部商品列表，存储为 `Map<id, Product>` 供 SessionList 使用。

**Rationale**:
- 商品数量通常很少（<50），一次性加载无性能问题
- 避免在 SessionList 中为每个会话项发起单独的 IPC 调用
- 与 ProductsPage 的加载模式一致
- `ChatInfo.itemId` 可能为 `null`，需处理无商品关联的场景

**Alternatives considered**:
- 按需 `product:getById(id)` — 每个 session 发一次 IPC，N+1 问题
- 在主进程 conversation:list 返回时附带 product 信息 — 改动 IPC 接口，影响面大

### R2: 可拖拽分隔条实现方案

**Decision**: 新建 `ResizableSplit` 组件，基于 `mousedown` / `mousemove` / `mouseup` 事件实现拖拽，使用 CSS 变量 `--panel-left-width` 驱动布局。

**Rationale**:
- 项目不使用任何 UI 框架，保持一致
- 纯 React + CSS 实现，无新增依赖
- 拖拽状态用 `useRef` 管理（不触发重渲染），仅在释放时 `setState` 更新宽度
- 分隔条宽度 4px，拖拽区域 8px（提升可操作性）

**Alternatives considered**:
- CSS `resize` 属性 — 仅支持右下角拖拽，不符合左右分隔需求
- 第三方库 (react-split-pane, allotment) — 违反项目约束

### R3: 商品主图缩略图样式

**Decision**: 40x40px 圆角方形（`border-radius: var(--radius-md)`），右侧固定位置。

**Rationale**:
- 与头像占位符 40x40 一致，视觉平衡
- 圆角方形比圆形更适合商品图片（保留更多画面信息）
- 使用 `<img>` + `onError` 降级到默认占位符

### R4: 消息预览截断方案

**Decision**: 使用 CSS `-webkit-line-clamp: 2` 配合 `overflow: hidden` 和 `display: -webkit-box`。

**Rationale**:
- 项目面向 Electron/Chromium，`-webkit-line-clamp` 完全支持
- 纯 CSS 方案，无需 JS 计算截断位置
- 非文本消息（图片/卡片）用 JS 判断显示占位文字

## Phase 1: Design

### Data Model

无需新增数据类型。使用现有 `Product` 类型建立内存索引：

```
ConversationsPage:
  products: Map<string, Product>  // key = Product.id

SessionList props 新增:
  products: Map<string, Product>  // 用于查找主图
```

### Contracts

无新增 IPC 通道或外部接口。变更限于渲染进程内部组件 props。

### Component API

```typescript
// ResizableSplit — 新增通用组件
interface ResizableSplitProps {
  left: React.ReactNode
  right: React.ReactNode
  initialLeftWidth?: number    // 默认 280
  minLeftWidth?: number        // 默认 200
  leftWidth: number            // 受控宽度
  onLeftWidthChange: (width: number) => void
}

// SessionList — props 新增 products
interface SessionListProps {
  sessions: Conversation[]
  selectedId: string | null
  onSelect: (chatId: string) => void
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  onDelete?: (chatId: string) => void
  products: Map<string, Product>  // 新增
}
```

## Implementation Tasks (Preview)

1. **T1**: 新建 `ResizableSplit` 组件 — 可拖拽分隔条
2. **T2**: 重构 `SessionList` 卡片样式 — 消息数对齐 + 主图 + 两行截断 + 非文本占位
3. **T3**: 重构 `ConversationsPage` — 双面板常驻布局 + 商品数据加载 + 移除切换逻辑
4. **T4**: 集成测试 — 验证所有验收场景
