# Tasks: 会话列表 UI 布局优化

**Input**: Design documents from `/specs/002-conversations-ui-polish/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: 未在规格中明确要求测试，不生成测试任务。

**Organization**: 按用户故事分组。US1 与 US2 共享 ResizableSplit 基础设施，合并为一个实施阶段。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事（US1, US2, US3）
- 描述中包含具体文件路径

---

## Phase 1: Foundational (基础设施)

**Purpose**: 创建 ResizableSplit 通用组件，为 US1/US2 的并排布局提供基础设施

- [x] T001 创建 ResizableSplit 可拖拽分隔条组件 in `src/renderer/src/components/ResizableSplit.tsx`

**实现要点**：
- Props: `left: ReactNode`, `right: ReactNode`, `leftWidth: number`（受控）, `onLeftWidthChange: (w: number) => void`, `minLeftWidth?: number`（默认 200）
- 使用 `onPointerDown` / `pointermove` / `pointerup` 实现拖拽
- `useRef` 跟踪拖拽中状态避免重渲染，仅在 `pointerup` 时回调
- 分隔条视觉 1px `var(--border-default)` 色，拖拽热区 padding 8px
- 拖拽中 `document.body.style.cursor = 'col-resize'` + `user-select: none`
- 左侧面板 `flex-shrink: 0; width: ${leftWidth}px`，右侧 `flex: 1; min-width: 0`

**Checkpoint**: ResizableSplit 组件可独立渲染并验证拖拽行为

---

## Phase 2: User Story 1+2 - 并排布局 + 拖拽分隔条 (Priority: P1+P2) 🎯 MVP

**Goal**: 将 ConversationsPage 从切换模式重构为左右并排常驻布局，列表始终可见，消息区即时切换，中间有可拖拽分隔条

**Independent Test**: 打开聊天记录页面 → 左侧列表可见 → 点击任意会话 → 右侧显示消息 → 点击另一会话 → 右侧切换 → 拖拽分隔条 → 左右宽度改变

### Implementation

- [x] T002 [US1] 新增商品数据加载逻辑 to `src/renderer/src/pages/ConversationsPage.tsx`
  - 新增 `products` state: `Product[]`
  - 新增 `loadProducts` useCallback: 调用 `window.electron.product.list()`
  - 用 `useMemo` 构建 `productsMap: Map<string, Product>`
  - 在 `useEffect` 中初始化加载（与 `loadSessions` 并行）

- [x] T003 [US1] 重构 ConversationsPage 为双面板布局 in `src/renderer/src/pages/ConversationsPage.tsx`
  - 新增 `leftWidth` state（初始 280）
  - 引入 `ResizableSplit` 包裹左右面板
  - left: `SessionList`（始终可见，传入 `productsMap`）
  - right: 选中时渲染 `MessageList` + `Input`，未选中时渲染空状态提示（保留聊天图标 SVG）
  - 传入 `selectedChatId` 作为 SessionList 的 `selectedId`
  - SessionList 的 `onSelect` 改为直接 `loadConversation`（不再切换视图状态）
  - 移除 `handleClose` 函数和返回按钮
  - 移除 `viewState` 状态中的 idle/viewing 切换逻辑（保留 loading/error）

- [x] T004 [US1] SessionList props 新增 products 参数 in `src/renderer/src/components/ConversationComponents/SessionList.tsx`
  - `SessionListProps` 新增 `products: Map<string, Product>`
  - 暂时不使用（US3 再做卡片样式改造），先接收参数避免类型错误

**Checkpoint**: 页面为左右并排布局，列表始终可见，点击切换右侧消息，拖拽分隔条调整宽度

---

## Phase 3: User Story 3 - 会话列表样式优化 (Priority: P3)

**Goal**: 优化会话卡片样式 — 消息数对齐、商品主图缩略图、消息两行截断

**Independent Test**: 查看会话列表 → 每个卡片用户名后紧跟"xx 条" → 卡片右侧有商品缩略图 → 无商品时显示占位图 → 长消息预览不超过两行

### Implementation

- [x] T005 [US3] 消息条数对齐：从右对齐改为紧跟用户名 in `src/renderer/src/components/ConversationComponents/SessionList.tsx`
  - 将 `{session.messages.length} 条` 从独立的 `<span>`（右对齐）移到用户名 `<span>` 后面
  - 格式：`{userName}` + ` · ` + `{count} 条`（用户名和消息数在同一行）
  - 移除外层 `justify-content: space-between` 的 flex 容器

- [x] T006 [US3] 新增商品主图缩略图 in `src/renderer/src/components/ConversationComponents/SessionList.tsx`
  - 在卡片右侧（`<button>` 外部）添加 40×40px 图片区域
  - 通过 `products.get(session.chatInfo.itemId)` 获取 `mainImageUrl`
  - `itemId` 为 `null` 或商品不存在时显示默认占位 SVG（商品图标）
  - `<img>` 设置 `onError` 降级到占位 SVG
  - `referrerPolicy="no-referrer"` 处理防盗链
  - 样式：`borderRadius: var(--radius-md)`，`objectFit: cover`

- [x] T007 [US3] 最近消息两行截断 + 非文本占位 in `src/renderer/src/components/ConversationComponents/SessionList.tsx`
  - 文本消息：CSS `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`
  - 非文本消息判断逻辑：
    - `type === 'image'` → 显示 `"[图片]"`
    - `type === 'card'` → 显示 `"[商品卡片]"`
    - 无消息 → 显示 `"暂无消息"`
  - 移除现有的 `textOverflow: 'ellipsis'; whiteSpace: 'nowrap'` 单行截断

**Checkpoint**: 所有卡片样式统一对齐，缩略图正常显示，消息预览整洁

---

## Phase 4: Polish & 集成验证

**Purpose**: 跨用户故事的最终验证和收尾

- [x] T008 执行 `pnpm typecheck` 验证 TypeScript 类型
- [x] T009 执行 `pnpm lint` 验证代码规范
- [x] T010 视觉验收：验证所有 spec 验收场景（US1 3个 + US2 4个 + US3 4个 = 11个场景）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: 无依赖，立即开始
- **US1+US2 (Phase 2)**: 依赖 Phase 1 完成
- **US3 (Phase 3)**: 依赖 Phase 2 完成（需要 products 数据流）
- **Polish (Phase 4)**: 依赖 Phase 3 完成

### User Story Dependencies

- **US1 (P1)**: 依赖 ResizableSplit 组件（Phase 1）
- **US2 (P2)**: 与 US1 合并实施，ResizableSplit 本身满足 US2 需求
- **US3 (P3)**: 依赖 US1 的 products 数据加载和 SessionList props 扩展

### Task Dependencies (Critical Path)

```
T001 (ResizableSplit)
  └→ T002 (商品数据加载)
     └→ T003 (ConversationsPage 布局重构)
        └→ T004 (SessionList props 扩展)
           └→ T005 [P] (消息数对齐)
           └→ T006 [P] (商品缩略图)
           └→ T007 [P] (消息截断)
              └→ T008 → T009 → T010
```

### Parallel Opportunities

- Phase 3 中 T005、T006、T007 可并行执行（同一文件但修改不同区域）
- Phase 4 中 T008 和 T009 可并行执行

---

## Implementation Strategy

### MVP (Phase 1 + Phase 2)

完成 T001–T004 后即可获得核心价值：并排布局 + 可拖拽分隔条 + 即时会话切换。

### Full Delivery (All Phases)

1. Phase 1: 创建 ResizableSplit → 基础就绪
2. Phase 2: 重构布局 → **MVP 可交付**（并排 + 拖拽）
3. Phase 3: 样式优化 → 完整体验
4. Phase 4: 验证 → 可合并

---

## Notes

- 所有变更限于渲染进程（renderer），无主进程或注入脚本改动
- 无新增依赖，无新增 IPC 通道
- ResizableSplit 为通用组件，未来其他页面可复用
- 删除会话、发送消息等已有功能保持不变
