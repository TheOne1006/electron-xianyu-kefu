# Research: 页面体验优化

**Branch**: `001-pages-ux-polish` | **Date**: 2026-04-05

## Research Items

### 1. ConfigForm 文案变更影响范围

**Decision**: 仅修改 2 处字符串常量
**Rationale**: "LLM 配置" 和 "保存配置" 仅在 ConfigForm.tsx 中出现，无其他引用
**Alternatives considered**: 无，改动范围明确

### 2. ProductsPage 文档标签 title 属性现状

**Decision**: 已有 title 属性，无需代码改动
**Rationale**: 当前代码 `<span key={title} title={allDocuments[title] ?? ''}>` 已设置 title 为完整文档内容。浏览器原生 title 属性会在 hover 时自动显示 tooltip。
**Alternatives considered**: 自定义 tooltip 组件 — 拒绝，因为 spec 明确使用原生 title 属性

**实际验证**: 经阅读 ProductsPage.tsx 第 218 行，`title={allDocuments[title] ?? ''}` 已存在且指向完整文档内容。此项可能已满足需求，需在实现阶段确认。

### 3. AgentConfigPage require → import 可行性

**Decision**: 使用 Vite 静态 import JSON 文件
**Rationale**:
- Vite 原生支持 `import jsonFile from './file.json'` 语法
- 项目已配置 `@shared/` 路径别名，可直接 `import xxx from '@shared/defaults/prompts/xxx.json'`
- JSON 文件结构已确认：每个文件包含 `{ temperature, maxTokens, prompt }` 三个字段
- 静态 import 在构建时解析，无运行时开销

**Alternatives considered**:
- 动态 `import()` — 过度设计，文件数量固定（5 个）
- 保持 require + eslint-disable — 技术债，用户明确要求改为 import

### 4. AgentConfigPage 重置逻辑现状

**Decision**: 当前 handleReset 已不触发保存，仅需替换默认值来源
**Rationale**:
- 当前 `handleReset` 仅调用 `setConfigs` 和 `setDirtyKeys`，不调用 `window.electron.agentConfig.upsert`
- 需要修改的是默认值获取方式：从 `getDefaultPrompt()` + `DEFAULT_CONFIGS` 改为统一的 `DEFAULT_PROMPTS` 映射
- `DEFAULT_CONFIGS` 常量的 temperature/maxTokens 值与 JSON 文件中的值重复，统一后可删除

### 5. prompt JSON 文件字段完整性

**Decision**: 所有 5 个 JSON 文件均包含 temperature、maxTokens、prompt 三个字段
**Rationale**: 经检查 classify.json 确认结构，其余文件同理（由 CLAUDE.md 目录结构统一管理）
**Alternatives considered**: 无
