# Quickstart: 会话列表 UI 布局优化

**Feature**: 002-conversations-ui-polish
**Date**: 2026-04-22

## 实现顺序

按依赖关系排列，每个 Task 可独立测试：

### Task 1: ResizableSplit 组件

**文件**: `src/renderer/src/components/ResizableSplit.tsx`（新建）

创建通用左右分割面板组件：
- 接受 `left`、`right` 两个 ReactNode 子元素
- 受控模式：`leftWidth` + `onLeftWidthChange`
- 中间分隔条 1px 宽 + 8px 拖拽热区
- Pointer events 实现拖拽（pointerdown → pointermove → pointerup）
- 拖拽中设置 `cursor: col-resize`，禁止文本选择
- 最小宽度约束：`minLeftWidth`（默认 200px）

**独立测试**: 渲染两个 div，拖拽分隔条验证宽度变化。

### Task 2: SessionList 卡片样式重构

**文件**: `src/renderer/src/components/ConversationComponents/SessionList.tsx`（修改）

变更点：
1. Props 新增 `products: Map<string, Product>`
2. 消息条数从右对齐改为紧跟用户名（`用户名  12 条`）
3. 卡片右侧新增 40×40 商品主图缩略图
   - 通过 `products.get(chatInfo.itemId)` 查找
   - `itemId` 为 null 或商品不存在时显示默认占位图标
   - `<img onError>` 降级到占位图标
4. 最近消息预览改为两行截断
   - CSS: `-webkit-line-clamp: 2` + `display: -webkit-box`
   - 非文本消息显示占位文字：`"[图片]"` / `"[卡片]"` / `"[付款]"`

**独立测试**: 传入 sessions + products 数据，视觉验证卡片布局。

### Task 3: ConversationsPage 布局重构

**文件**: `src/renderer/src/pages/ConversationsPage.tsx`（修改）

变更点：
1. 新增 `products` state + 加载逻辑
2. 用 `useMemo` 构建 `productsMap: Map<string, Product>`
3. 新增 `leftWidth` state（初始 280px）
4. 移除"未选中时显示空状态+选中后全屏消息"的双态切换
5. 使用 `ResizableSplit` 包裹左右面板：
   - left: `SessionList`（始终可见）
   - right: 选中时显示 `MessageList` + `Input`，未选中时显示空状态
6. 移除返回按钮和 `handleClose` 逻辑
7. 删除按钮保持原有行为

**独立测试**: 加载页面，点击会话切换，验证列表始终可见 + 右侧切换消息。

### Task 4: 集成验证

- 执行 `pnpm typecheck` 验证类型
- 执行 `pnpm lint` 验证代码规范
- 手动验证所有 spec 验收场景

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/renderer/src/components/ResizableSplit.tsx` | 新建 | 可拖拽分隔条组件 |
| `src/renderer/src/components/ConversationComponents/SessionList.tsx` | 修改 | 卡片样式重构 |
| `src/renderer/src/pages/ConversationsPage.tsx` | 修改 | 双面板布局重构 |
