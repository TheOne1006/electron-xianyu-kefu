# Renderer Pages Refactor Design

## 背景

当前 `src/renderer/src/pages` 下的高复杂页面存在以下共性问题：

- `Page` 文件同时承担数据加载、状态管理、事件处理、视图渲染和样式定义。
- `ProductsPage.tsx` 与 `DocumentsPage.tsx` 包含弹窗、确认框、表格和悬浮提示，文件长度与职责都已超出单一入口组件的合理范围。
- `AgentConfigPage.tsx` 混合了配置加载、脏状态计算和卡片表单 UI，不利于复用与测试。
- 大量内联样式重复出现，未充分复用现有全局样式 token 与基础 class。

## 目标

- 将高复杂页面拆分为“页面入口 + 业务 hooks + 视图组件 + 页面级 CSS”结构。
- 保持 `xxxPage.tsx` 尽量在 300 行以内，并让大部分页面入口进一步缩减到 100 至 180 行。
- 使用现有全局样式体系，补充少量页面级 class，减少重复内联样式。
- 为页面入口、hooks、核心组件和关键函数补充 JSDoc，提升可维护性。
- 保持现有业务行为不变，包括数据加载、增删改、提示反馈、悬浮预览和对话刷新逻辑。

## 范围

本次优先重构高复杂页面：

- `ProductsPage.tsx`
- `DocumentsPage.tsx`
- `AgentConfigPage.tsx`

以下页面保持轻量整理，不做大规模改造：

- `ConfigsPage.tsx`
- `ConversationsPage.tsx`
- `QAndAPage.tsx`
- `QuickStartPage.tsx`

## 方案对比

### 方案 A：Hook + 组件 + CSS 分层

做法：

- 页面仅负责路由入口和组件装配。
- 数据获取、状态管理、增删改动作下沉到页面专属 hooks。
- 复杂 UI 拆为独立视图组件。
- 内联样式迁移到页面级 CSS class，并复用全局 `card`、`btn`、`form-group` 等类。

优点：

- 业务代码与视图分层最清晰。
- 文件职责明确，便于后续继续扩展。
- 更容易单独测试 hooks 和组件。

缺点：

- 改动范围较大，需要同步整理类型与目录结构。

### 方案 B：仅拆组件

做法：

- 保留页面内部状态与副作用。
- 将表格、弹窗、空态等部分拆为子组件。

优点：

- 改动较小，落地速度快。

缺点：

- 页面仍持有过多业务逻辑。
- 长期维护收益有限。

### 方案 C：Hook 优先

做法：

- 优先提取页面 hook。
- 页面视图仅做少量拆分。

优点：

- 先解决数据与状态复杂度。

缺点：

- 页面行数和样式重复问题改善有限。

## 推荐方案

采用方案 A。

该方案最符合当前目标，能够同时解决职责混杂、页面过长和样式重复三类问题，并且可以在不改变业务行为的前提下渐进式落地。

## 目录规划

```text
src/renderer/src/
├── components/
│   ├── agent-config/
│   ├── documents/
│   └── products/
├── hooks/
│   ├── useAgentConfigs.ts
│   ├── useDocumentsPage.ts
│   └── useProductsPage.ts
├── pages/
│   ├── AgentConfigPage.tsx
│   ├── DocumentsPage.tsx
│   ├── ProductsPage.tsx
│   └── styles/
│       ├── agent-config-page.css
│       ├── documents-page.css
│       └── products-page.css
```

## 页面设计

### ProductsPage

页面入口负责：

- 组合 `ProductsTable`、`ProductModal`、`DeleteProductDialog`、`DocumentTooltip`
- 传递 hook 返回的状态和事件

`useProductsPage` 负责：

- 加载产品和文档数据
- 维护新增、编辑、删除、tooltip 等 UI 状态
- 执行 `product.upsert`、`product.deleteById`
- 对数据进行视图层所需的轻量映射

组件职责：

- `ProductsTable` 负责表格渲染、按钮点击和文档 hover 事件透传
- `ProductModal` 负责表单录入
- `DeleteProductDialog` 负责删除确认
- `DocumentTooltip` 负责只读悬浮内容显示

### DocumentsPage

页面入口负责：

- 组合 `DocumentsTable`、`DocumentModal`、`DeleteDocumentDialog`

`useDocumentsPage` 负责：

- 文档列表加载
- 新增、编辑、删除动作
- 弹窗状态管理

组件职责：

- `DocumentsTable` 负责列表和操作按钮
- `DocumentModal` 负责编辑表单
- `DeleteDocumentDialog` 负责删除确认

### AgentConfigPage

页面入口负责：

- 遍历配置卡片并渲染 `AgentConfigCard`

`useAgentConfigs` 负责：

- 统一加载 Agent 配置
- 管理脏状态集合
- 提供字段修改、保存、重置动作

组件职责：

- `AgentConfigCard` 负责单个 Agent 的参数输入和 Prompt 编辑

## 样式策略

- 保留全局 `main.css` 里的基础能力 class，不新增重复工具类。
- 页面专属布局、表格、图片、tooltip、空态等样式迁移到 `pages/styles/*.css`。
- 组件优先通过语义 class 命名组织样式，例如 `products-page__table`、`documents-page__empty`。
- 仅在少量动态场景保留必要的内联样式，例如 tooltip 定位坐标。

## JSDoc 规范

- 页面组件：描述页面职责与边界。
- 自定义 hooks：说明返回值结构与管理的状态范围。
- 关键事件处理函数：说明输入输出与副作用。
- 可复用组件：说明用途与关键 props。

## 风险与处理

- 拆分后 props 透传增多：通过局部类型接口和明确命名降低混乱。
- 样式迁移可能引发布局偏差：优先复用现有 token，并在改动后做基础检查。
- 模态框拆分可能改变交互细节：保持原有按钮文案、关闭方式和提示文案不变。

## 验证方式

- 运行类型诊断与 lint，确保没有新增错误。
- 检查高复杂页面的核心流程：加载、编辑、新增、删除、提示反馈。
- 确认页面入口文件长度明显下降，样式从内联迁移到 class。
