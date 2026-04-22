# Research: 会话列表 UI 布局优化

**Feature**: 002-conversations-ui-polish
**Date**: 2026-04-22

## R1: Product 数据获取方式

**Decision**: ConversationsPage 初始化时调用 `window.electron.product.list()` 获取全量商品，构建 `Map<string, Product>` 传递给 SessionList。

**Rationale**:
- 商品数量通常 <50，一次性加载无性能问题
- 避免 N+1 IPC 调用（每条会话单独查商品）
- 与 ProductsPage 的加载模式一致
- `ChatInfo.itemId` 可为 `null`，需处理无商品关联的场景

**Alternatives considered**:
- 按需 `product:getById(id)` — N+1 问题，每条会话多一次 IPC
- 扩展 conversation:list IPC 返回附带 product 信息 — 改动主进程接口，影响面过大

## R2: 可拖拽分隔条实现方案

**Decision**: 新建 `ResizableSplit` React 组件，基于 pointer events (`onPointerDown` / `pointermove` / `pointerup`) 实现拖拽。

**Rationale**:
- 项目无 UI 框架依赖，保持一致性
- Pointer events 比 mouse events 更通用（兼容触控设备）
- 使用 `useRef` 跟踪拖拽状态避免重渲染，仅 `onPointerUp` 时 `setState` 更新宽度
- 分隔条视觉宽度 1px（`var(--border-default)` 色），拖拽热区 padding 8px

**Alternatives considered**:
- CSS `resize` — 仅支持元素右下角，不满足左右分隔需求
- 第三方库 (react-split-pane, allotment) — 违反项目"不引入第三方拖拽库"约束
- HTML `<hr>` draggable — 不适合精确宽度控制

## R3: 商品主图缩略图样式

**Decision**: 40×40px 圆角方形（`border-radius: var(--radius-md)` = 6px），右侧固定位置。

**Rationale**:
- 与头像占位符尺寸一致（40×40），视觉平衡
- 圆角方形比圆形保留更多商品画面信息
- `<img>` + `onError` 降级到默认占位 SVG

**Alternatives considered**:
- 圆形（与头像统一）— 裁切过多商品信息
- 56×56 — 过大，挤压文字空间

## R4: 消息预览截断方案

**Decision**: CSS `-webkit-line-clamp: 2` + `display: -webkit-box` + `overflow: hidden`。

**Rationale**:
- Electron 基于 Chromium，`-webkit-line-clamp` 原生支持
- 纯 CSS 方案，无需 JS 计算文本截断
- 非文本消息（图片/卡片类型）在 JS 层判断，显示 `"[图片]"` / `"[卡片]"` 占位文字

**Alternatives considered**:
- JS `substring` 截断 — 无法按行数截断，中英文宽度不一致
- `text-overflow: ellipsis` + `whiteSpace: nowrap` — 仅单行，不符合两行需求
