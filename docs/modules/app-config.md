# Module: App Config

> 应用配置管理 — LLM 连接参数、浏览器 URL、安全过滤关键词、接管关键词

## 跨层文件

```
src/shared/types.ts                     # AppConfig 接口定义
src/main/stores/app-config-store.ts     # 数据持久化（electron-store name='config'）
src/main/ipc-handlers.ts                # config:get / config:save
src/main/business/agent-runner.ts       # 读取 LLM 连接参数（model/baseURL/apiKey）
src/main/business/safety-filter.ts      # 读取安全过滤关键词
src/preload/index.ts                    # 暴露 config.get() / config.save()
src/preload/page-agent-inject.ts        # 已删除（page-agent 已移除）
src/preload/preload-browser.ts          # 注入层配置解析
src/renderer/src/pages/ConfigsPage.tsx  # 配置管理页面
src/renderer/src/components/ConfigForm.tsx  # 配置表单组件
src/shared/defaults/configs/app-config.json  # 默认配置
```

## 数据流

```
┌─ 渲染进程 ──────────────────────────────────────────────────┐
│  ConfigsPage.tsx → ConfigForm.tsx                           │
│  window.electron.config.get() / .save(partial)              │
└──────────────────────┬──────────────────────────────────────┘
                       │ ipcRenderer.invoke
┌─ 桥接层 ─────────────┼─────────────────────────────────────┐
│  preload/index.ts     │                                     │
│  config.get → invoke('config:get')                          │
│  config.save → invoke('config:save', partial)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌─ 主进程 ─────────────▼─────────────────────────────────────┐
│  ipc-handlers.ts                                            │
│  config:get → getAppConfig() ─→ app-config-store            │
│  config:save → saveAppConfig(partial) ─→ 浅合并写入          │
│                                                              │
│  下游消费者：                                                │
│  ├─ agent-runner.ts → getAppConfig() 取 LLM 参数            │
│  └─ safety-filter.ts → appStore.store 取过滤关键词           │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼ 启动浏览器时
┌─ 注入层 ────────────────────────────────────────────────────┐
│  preload-browser.ts → 解析配置 → message-handler             │
│  → page-agent 已移除，相关配置待清理                         │
└──────────────────────────────────────────────────────────────┘
```

## AppConfig 字段

| 字段                          | 类型                 | 用途           | 消费方          |
| ----------------------------- | -------------------- | -------------- | --------------- |
| `model`                       | `string`             | LLM 模型名     | agent-runner.ts |
| `baseURL`                     | `string`             | API 基础 URL   | agent-runner.ts |
| `apiKey`                      | `string`             | API 密钥       | agent-runner.ts |
| `language`                    | `'zh-CN' \| 'en-US'` | 回复语言       | browser.ts      |
| `browserUrl`                  | `string`             | 闲鱼页面 URL   | browser.ts      |
| `humanTakeoverKeywords`       | `string`             | 人工接管关键词 | agent.ts        |
| `safetyFilterBlockedKeywords` | `string[]`           | 过滤关键词列表 | safety-filter.ts |
| `safetyFilterReplacement`     | `string`             | 过滤替换文本   | safety-filter.ts |

## 关键函数

| 层           | 函数                                               | 说明                            |
| ------------ | -------------------------------------------------- | ------------------------------- |
| main/store   | `getAppConfig(): AppConfig`                        | 获取完整配置                    |
| main/store   | `saveAppConfig(partial: Partial<AppConfig>): void` | 浅合并保存                      |
| main/handler | `config:get` handler                               | 包装为 `IpcResult<AppConfig>`   |
| main/handler | `config:save` handler                              | 包装为 `IpcResult<null>`        |
| preload      | `config.get()`                                     | → invoke('config:get')          |
| preload      | `config.save(config)`                              | → invoke('config:save', config) |
| preload      | `buildPageAgentConfig(config)`                     | 构建 JSON 字符串注入到 bundle   |

## 设计约束

- **浅合并**：`saveAppConfig` 使用 `{...current, ...partial}`，嵌套对象会被整体替换
- **同步生效**：保存后主进程立即生效（下次调用 `getAppConfig()` 读取最新值）
- **注入层异步生效**：浏览器窗口的配置在创建时内联，运行中修改需要重启浏览器窗口
