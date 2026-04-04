# Implementation Plan: 页面体验优化

**Branch**: `001-pages-ux-polish` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-pages-ux-polish/spec.md`

## Summary

三项 UI 页面体验优化：设置页文案重命名（"LLM 配置"→"模型设置"、"保存配置"→"保存设置"）、产品列表页文档标签 hover 提示完整内容、Agent 配置页重置逻辑修正（仅重置不保存，require→import，三字段全部重置）。所有改动限定在 renderer 层 3 个文件内，无需修改 main 进程或 IPC 层。

## Technical Context

**Language/Version**: TypeScript 5.9.3
**Primary Dependencies**: React 19.2.1, Vite 7.2.6
**Storage**: 无变更（electron-store 保持不变）
**Testing**: Vitest 4.1.2（本特性为纯 UI 文案/交互改动，无需新增测试）
**Target Platform**: macOS (Electron 桌面应用)
**Project Type**: Desktop App (Electron + React SPA)
**Performance Goals**: 无性能变更
**Constraints**: 无新增约束
**Scale/Scope**: 3 个 React 组件文件的文案/交互微调

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Constitution 文件为模板状态，无实际约束条件。所有改动通过。

## Project Structure

### Documentation (this feature)

```text
specs/001-pages-ux-polish/
├── spec.md              # 功能规格说明
├── plan.md              # 本文件
├── research.md          # Phase 0 研究
├── quickstart.md        # 快速上手指南
└── checklists/
    └── requirements.md  # 规格质量检查清单
```

### Source Code (repository root)

```text
src/renderer/src/
├── components/
│   └── ConfigForm.tsx          # [修改] 文案：LLM 配置 → 模型设置，保存配置 → 保存设置
└── pages/
    ├── ProductsPage.tsx        # [修改] 文档标签增加 title 属性显示完整内容
    └── AgentConfigPage.tsx     # [修改] 重置逻辑 + require → import

src/shared/defaults/prompts/    # [只读] 默认配置引用源
    ├── system.json
    ├── classify.json
    ├── default.json
    ├── price.json
    └── tech.json
```

**Structure Decision**: 仅修改 3 个 renderer 层文件，无结构变更。

## Implementation Tasks

### Task 1: ConfigForm 文案重命名

**文件**: `src/renderer/src/components/ConfigForm.tsx`
**改动**:
1. 第 62 行：`LLM 配置` → `模型设置`
2. 第 190 行：`保存配置` → `保存设置`（`saving ? '保存中...' : '保存配置'` → `saving ? '保存中...' : '保存设置'`）

**验证**: 打开设置页面确认标题和按钮文案。

### Task 2: ProductsPage 文档标签 Hover 提示

**文件**: `src/renderer/src/pages/ProductsPage.tsx`
**改动**:
1. 第 218 行附近：文档标签 `<span>` 元素已有 `title={allDocuments[title] ?? ''}` — 需要确认当前 `title` 属性是否已展示完整内容
2. 如果已有 `title` 属性则无需修改；如果 `title` 仅显示标题而非内容，需修改为显示 `allDocuments[title]`（完整文档内容）

**当前代码分析**:
```tsx
<span key={title} title={allDocuments[title] ?? ''}>
  {title}
</span>
```
当前已有 `title` 属性指向完整文档内容。需验证是否正确显示。

**验证**: 产品列表页悬停文档标签，确认显示完整文档内容。

### Task 3: AgentConfigPage 重置逻辑修正

**文件**: `src/renderer/src/pages/AgentConfigPage.tsx`
**改动**:

1. **require → import**: 将 `getDefaultPrompt` 函数中的 `require()` 调用改为顶部静态 `import`
   - 删除 `getDefaultPrompt` 函数
   - 在文件顶部添加 5 个静态 import：
     ```ts
     import systemDefault from '@shared/defaults/prompts/system.json'
     import classifyDefault from '@shared/defaults/prompts/classify.json'
     import defaultAgentDefault from '@shared/defaults/prompts/default.json'
     import priceDefault from '@shared/defaults/prompts/price.json'
     import techDefault from '@shared/defaults/prompts/tech.json'
     ```
   - 创建默认配置映射：
     ```ts
     const DEFAULT_PROMPTS: Record<AgentKey, { temperature: number; maxTokens: number; prompt: string }> = {
       system: systemDefault,
       classify: classifyDefault,
       default: defaultAgentDefault,
       price: priceDefault,
       tech: techDefault
     }
     ```

2. **重置仅恢复不保存**: 修改 `handleReset` 函数
   - 当前行为：重置后显示 toast 提示"已重置为默认"（不改保存逻辑已经正确 — 当前 `handleReset` 不调用 `window.electron.agentConfig.upsert`）
   - 确认当前代码已正确：`handleReset` 只更新 `setConfigs` 和 `setDirtyKeys`，不触发保存
   - 修改：使用 `DEFAULT_PROMPTS[key]` 替代 `getDefaultPrompt(key)` + `DEFAULT_CONFIGS[key]` 分别取值
   - 确保重置时 temperature、maxTokens、prompt 三个字段全部从默认配置文件获取

3. **清理 DEFAULT_CONFIGS 常量**: 移除 `DEFAULT_CONFIGS` 常量（其值已由 `DEFAULT_PROMPTS` 替代）

**验证**: Agent 配置页修改 prompt 后点重置 → 三字段恢复默认值 → 刷新页面确认未保存 → 点保存后刷新确认已持久化。

## Complexity Tracking

无违规项。所有改动为简单的文案替换和逻辑微调。
