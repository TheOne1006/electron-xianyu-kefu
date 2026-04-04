# Quickstart: 页面体验优化

**Branch**: `001-pages-ux-polish`

## 改动文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/renderer/src/components/ConfigForm.tsx` | 文案替换 | "LLM 配置"→"模型设置"、"保存配置"→"保存设置" |
| `src/renderer/src/pages/ProductsPage.tsx` | 验证确认 | 文档标签已有 title 属性，验证是否满足需求 |
| `src/renderer/src/pages/AgentConfigPage.tsx` | 逻辑重构 | require→import、重置三字段、删除 DEFAULT_CONFIGS |

## 快速验证步骤

```bash
pnpm dev
```

1. **设置页**: 打开 `/configs` → 确认左列标题"模型设置" + 底部按钮"保存设置"
2. **产品页**: 打开 `/products` → 找到有关联文档的产品 → 悬停文档标签 → 确认显示完整内容
3. **Agent 页**: 打开 `/agent-config` → 修改某个 Agent 的 prompt → 点"重置" → 确认三字段恢复默认 → 刷新页面确认未保存

## 类型检查

```bash
pnpm typecheck
```
