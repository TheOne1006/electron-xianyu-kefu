# Tasks: 页面体验优化

**Input**: Design documents from `/specs/001-pages-ux-polish/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: 本特性为纯 UI 文案/交互改动，spec 未要求测试，不生成测试任务。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 - 设置页面文案调整 (Priority: P1) 🎯 MVP

**Goal**: 将设置页面中"LLM 配置"更名为"模型设置"，"保存配置"更名为"保存设置"

**Independent Test**: 打开 `/configs` 页面，确认左列标题"模型设置" + 底部按钮"保存设置"

### Implementation for User Story 1

- [x] T001 [US1] 将"LLM 配置"标题更名为"模型设置" in `src/renderer/src/components/ConfigForm.tsx`（第 62 行）
- [x] T002 [US1] 将"保存配置"按钮文案更名为"保存设置" in `src/renderer/src/components/ConfigForm.tsx`（第 190 行）

**Checkpoint**: 设置页文案更新完成，打开页面确认标题和按钮文案正确

---

## Phase 2: User Story 2 - 产品列表页文档 Hover 提示 (Priority: P2)

**Goal**: 产品列表页文档标签 hover 时展示完整文档内容

**Independent Test**: 打开 `/products` 页面，找到有关联文档的产品行，鼠标悬停文档标签确认显示完整内容

### Implementation for User Story 2

- [x] T003 [US2] 验证文档标签 title 属性已展示完整文档内容 in `src/renderer/src/pages/ProductsPage.tsx`（第 218 行）— 确认 `title={allDocuments[title] ?? ''}` 已正确绑定

**Checkpoint**: 产品页文档 hover 提示正常显示

---

## Phase 3: User Story 3 - Agent 配置页重置逻辑修正 (Priority: P3)

**Goal**: 重置按钮仅恢复默认值不保存，require→import，三字段全部重置

**Independent Test**: 打开 `/agent-config` 页面 → 修改 prompt → 点"重置" → 三字段恢复默认 → 刷新页面确认未保存 → 点保存后刷新确认已持久化

### Implementation for User Story 3

- [x] T004 [US3] 将 `getDefaultPrompt` 中的 `require()` 替换为顶部静态 `import` 5 个 JSON 文件 in `src/renderer/src/pages/AgentConfigPage.tsx`
- [x] T005 [US3] 创建 `DEFAULT_PROMPTS` 映射替代 `DEFAULT_CONFIGS` 常量，统一从 JSON 文件获取 temperature/maxTokens/prompt in `src/renderer/src/pages/AgentConfigPage.tsx`
- [x] T006 [US3] 修改 `handleReset` 函数使用 `DEFAULT_PROMPTS[key]` 统一重置三个字段 in `src/renderer/src/pages/AgentConfigPage.tsx`
- [x] T007 [US3] 删除 `getDefaultPrompt` 函数和 `DEFAULT_CONFIGS` 常量 in `src/renderer/src/pages/AgentConfigPage.tsx`

**Checkpoint**: Agent 配置页重置逻辑修正完成，require 已清除，重置仅恢复不保存

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: 验证所有改动正确性

- [x] T008 运行 `pnpm typecheck` 确认 TypeScript 类型检查通过
- [x] T009 运行 `pnpm lint` 确认 ESLint 检查通过

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Story 1 (Phase 1)**: 无依赖，可立即开始
- **User Story 2 (Phase 2)**: 无依赖，可立即开始
- **User Story 3 (Phase 3)**: 无依赖，可立即开始。T004→T005→T006→T007 需顺序执行
- **Polish (Phase 4)**: 依赖所有用户故事完成

### User Story Dependencies

- **US1**: 无依赖 — 独立可测试
- **US2**: 无依赖 — 独立可测试
- **US3**: 无依赖 — 独立可测试（T004-T007 内部有顺序依赖）

### Parallel Opportunities

- T001 + T002: 同文件内顺序执行（改动行不同，但建议一次性完成）
- T003: 与 T001/T002 可完全并行（不同文件）
- T004-T007: 需顺序执行（同一文件内的依赖链）

---

## Parallel Example

```bash
# US1 和 US2 可完全并行（不同文件）:
Task: "T001 + T002: ConfigForm 文案替换"
Task: "T003: ProductsPage 文档 hover 验证"

# US3 需顺序执行完成后，再跑 Polish:
Task: "T004 → T005 → T006 → T007: AgentConfigPage 重构"
Task: "T008 + T009: typecheck + lint"
```

---

## Implementation Strategy

### Sequential (推荐)

1. 完成 Phase 1 (US1): ConfigForm 文案替换 — 最简单
2. 完成 Phase 2 (US2): ProductsPage hover 验证 — 确认即可
3. 完成 Phase 3 (US3): AgentConfigPage 重构 — 最复杂
4. 完成 Phase 4: typecheck + lint 验证

### Incremental Delivery

1. US1 完成 → 设置页文案已更新（可独立交付）
2. US2 完成 → 产品页 hover 已确认（可独立交付）
3. US3 完成 → Agent 重置逻辑已修正（可独立交付）
4. Polish → 全部验证通过

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- 每个用户故事可独立完成和测试
- US3 中 T004-T007 有内部顺序依赖（同文件改动）
- 完成后运行 `pnpm typecheck` 和 `pnpm lint` 验证
