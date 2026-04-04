# Feature Specification: 页面体验优化

**Feature Branch**: `001-pages-ux-polish`
**Created**: 2026-04-05
**Status**: Draft
**Input**: User description: "UI 页面优化：设置页重命名、产品页文档 hover 提示、Agent 配置页重置逻辑修正"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 设置页面文案调整 (Priority: P1)

用户在设置页面（ConfigsPage）中，看到"LLM 配置"区块标题更名为"模型设置"，底部保存按钮从"保存配置"更名为"保存设置"。整体文案更加简洁一致。

**Why this priority**: 文案变更是最基础的 UI 调整，影响所有用户对设置页的第一印象，修改简单且无副作用。

**Independent Test**: 打开设置页面，确认区块标题显示"模型设置"，底部按钮显示"保存设置"。

**Acceptance Scenarios**:

1. **Given** 用户打开设置页面，**When** 页面加载完成，**Then** 左列区块标题显示为"模型设置"
2. **Given** 用户打开设置页面，**When** 查看底部保存按钮，**Then** 按钮文案显示为"保存设置"
3. **Given** 用户修改配置后点击"保存设置"，**When** 保存进行中，**Then** 按钮文案变为"保存中..."，保存成功后恢复为"保存设置"

---

### User Story 2 - 产品列表页文档 Hover 提示 (Priority: P2)

用户在产品列表页查看某产品关联的文档标签时，鼠标悬停在文档标签上可看到完整的文档内容信息（通过 title 属性展示），方便快速预览文档内容而无需跳转到文档管理页。

**Why this priority**: 文档 hover 提示改善了用户查看产品关联文档的效率，是信息可发现性的提升。

**Independent Test**: 打开产品列表页，找到有关联文档的产品行，鼠标悬停在文档标签上，确认出现完整文档内容的提示。

**Acceptance Scenarios**:

1. **Given** 产品列表页中有产品包含关联文档，**When** 鼠标悬停在某文档标签上，**Then** 显示该文档的完整内容作为提示信息
2. **Given** 产品列表页中某产品无关联文档，**When** 查看文档列，**Then** 显示"-"占位符，无 hover 效果
3. **Given** 文档内容非常长（超过 200 字），**When** 鼠标悬停，**Then** 仍然显示完整内容（由浏览器原生 title 提示自动处理截断）

---

### User Story 3 - Agent 配置页重置逻辑修正 (Priority: P3)

用户在 Agent 配置页点击"重置"按钮时，仅将表单内容重置为默认值（temperature、maxTokens、prompt 三个字段），不自动保存。用户需要手动点击"保存"才会持久化。同时，默认值的加载方式从 require 改为 import 静态导入。

**Why this priority**: 重置逻辑是交互体验的修正，确保用户对"重置"和"保存"两个操作有明确的心理模型，避免误操作导致配置丢失。

**Independent Test**: 打开 Agent 配置页，修改某个 Agent 的 prompt 后点击"重置"，确认表单恢复为默认值但未被持久化；刷新页面确认默认值正确加载。

**Acceptance Scenarios**:

1. **Given** 用户修改了某个 Agent 的 prompt，**When** 点击"重置"按钮，**Then** temperature、maxTokens、prompt 三个字段均恢复为默认值，dirty 状态标记消失
2. **Given** 用户点击"重置"后表单已恢复默认值，**When** 刷新页面（未点保存），**Then** 显示之前保存的配置（非默认值），证明重置未自动保存
3. **Given** 用户点击"重置"后表单恢复默认值，**When** 点击"保存"按钮，**Then** 配置被持久化为默认值
4. **Given** 默认配置文件中包含 temperature、maxTokens、prompt 的完整定义，**When** 页面加载时，**Then** 通过静态 import 正确读取默认值

---

### Edge Cases

- 文档内容为空字符串时，hover 提示应显示空或"-"
- 重置操作后用户未保存直接离开页面，不会有任何提示（与当前行为一致）
- 默认配置 JSON 文件缺失或格式错误时，重置功能应优雅降级（使用硬编码兜底值）

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: ConfigForm 组件中，"LLM 配置"标题 MUST 更名为"模型设置"
- **FR-002**: ConfigForm 组件中，"保存配置"按钮文案 MUST 更名为"保存设置"（包括加载态"保存中..."保持不变）
- **FR-003**: ProductsPage 中，每个文档标签 MUST 通过 title 属性展示完整的文档内容，鼠标悬停时可预览
- **FR-004**: AgentConfigPage 的重置功能 MUST 仅将表单值恢复为默认值，不触发保存操作
- **FR-005**: AgentConfigPage 重置时 MUST 同时恢复 temperature、maxTokens、prompt 三个字段
- **FR-006**: AgentConfigPage 的默认值加载 MUST 使用静态 import 方式替代 require

### Key Entities

- **AppConfig 配置表单**: 设置页面中的配置实体，包含模型、URL、API Key 等字段
- **Product 文档关联**: 产品与文档的关联关系，产品列表中展示关联文档标签
- **AgentConfig 默认配置**: 每个 Agent 的默认 temperature、maxTokens、prompt 值

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 设置页面的区块标题和按钮文案准确反映新命名，所有用户可正确识别功能入口
- **SC-002**: 产品列表页文档标签的 hover 提示 100% 覆盖所有关联文档，用户无需跳转即可预览内容
- **SC-003**: Agent 配置页重置操作 100% 不触发自动保存，用户刷新后配置保持不变
- **SC-004**: Agent 默认值通过静态导入加载，不存在 require 调用

## Assumptions

- 文档 hover 提示使用浏览器原生 title 属性实现，无需自定义 tooltip 组件
- Agent 默认配置文件（`@shared/defaults/prompts/*.json`）始终存在且格式正确
- 重置后 dirty 标记清除的行为符合用户预期，无需额外确认提示
- 当前 ConfigForm 中"保存中..."的加载态文案不需要变更
