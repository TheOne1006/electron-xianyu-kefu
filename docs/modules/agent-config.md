# Module: Agent Config

> Agent 配置管理 — 5 个 Agent 的提示词（prompt）和推理参数（temperature / maxTokens）

## 跨层文件

```
src/shared/types.ts                     # AgentKey 类型 / AgentConfig 接口
src/main/stores/agent-config-store.ts   # 数据持久化（electron-store name='agent-config'）
src/main/ipc-handlers.ts                # agent-config:all / getById / upsert
src/main/business/agent-runner.ts       # 读取 prompt + 参数构建 OpenAI 请求
src/preload/index.ts                    # 暴露 agentConfig.all / upsert
src/renderer/src/pages/AgentConfigPage.tsx  # Agent 配置页面（5 个 Agent 卡片）
src/shared/defaults/prompts/            # 默认提示词（5 个 JSON 文件）
```

## 数据流

```
┌─ 渲染进程 ──────────────────────────────────────────────────┐
│  AgentConfigPage.tsx                                        │
│  window.electron.agentConfig.all() / .upsert(key, config)  │
└──────────────────────┬──────────────────────────────────────┘
                       │ ipcRenderer.invoke
┌─ 桥接层 ─────────────┼─────────────────────────────────────┐
│  preload/index.ts     │                                     │
│  agentConfig.all   → invoke('agent-config:all')             │
│  agentConfig.upsert → invoke('agent-config:upsert', ...)    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌─ 主进程 ─────────────▼─────────────────────────────────────┐
│  ipc-handlers.ts                                            │
│  agent-config:all       → getAllAgentConfigs()               │
│  agent-config:getById   → getAgentConfig(key)               │
│  agent-config:upsert   → upsertAgentConfig(key, config)     │
│                                                              │
│  下游消费者：                                                │
│  agent-runner.ts → getAgentConfig(key)                       │
│    → 构建 system prompt + 设置 temperature/maxTokens         │
└──────────────────────────────────────────────────────────────┘
```

## Agent 类型

| AgentKey   | 用途       | 使用场景                                  |
| ---------- | ---------- | ----------------------------------------- |
| `system`   | 系统级指令 | 全局约束和角色定义                        |
| `classify` | 意图分类   | `intent-router.ts` 调用，分类用户消息意图 |
| `default`  | 通用回复   | 兜底 Agent，处理非价格非技术问题          |
| `price`    | 价格/砍价  | 用户询问价格、议价场景                    |
| `tech`     | 技术问题   | 商品相关技术问题咨询                      |

## AgentConfig 字段

| 字段          | 类型     | 说明                  |
| ------------- | -------- | --------------------- |
| `temperature` | `number` | LLM 随机性参数（0-1） |
| `maxTokens`   | `number` | 最大生成 token 数     |
| `prompt`      | `string` | 系统提示词文本        |

## 默认资源

```
src/shared/defaults/prompts/
├── system.json     → { temperature: 0.7, maxTokens: 2048, prompt: "..." }
├── classify.json   → { temperature: 0.1, maxTokens: 50,   prompt: "..." }
├── default.json    → { temperature: 0.7, maxTokens: 1024, prompt: "..." }
├── price.json      → { temperature: 0.7, maxTokens: 1024, prompt: "..." }
└── tech.json      → { temperature: 0.7, maxTokens: 1024, prompt: "..." }
```

## 关键函数

| 层          | 函数                                                  | 说明                   |
| ----------- | ----------------------------------------------------- | ---------------------- |
| main/store  | `getAgentConfig(key): AgentConfig`                    | 获取指定 Agent 配置    |
| main/store  | `getAllAgentConfigs(): Record<AgentKey, AgentConfig>` | 获取全部               |
| main/store  | `upsertAgentConfig(key, config): void`                | 全量替换 Agent 配置    |
| main/runner | `buildSystemPrompt(key, product): string`             | 拼接 prompt + 商品信息 |
| preload     | `agentConfig.all()`                                   | → agent-config:all     |
| preload     | `agentConfig.upsert(key, config)`                     | → agent-config:upsert  |

## IPC 通道

| 通道                   | 方向            | 请求参数                               | 响应类型                        | 说明                |
| ---------------------- | --------------- | -------------------------------------- | ------------------------------- | ------------------- |
| `agent-config:all`     | renderer → main | 无                                     | `Record<AgentKey, AgentConfig>` | 获取全部 Agent 配置 |
| `agent-config:getById` | renderer → main | `{key: AgentKey}`                      | `AgentConfig`                   | 获取指定 Agent 配置 |
| `agent-config:upsert`  | renderer → main | `{key: AgentKey, config: AgentConfig}` | `null`                          | 全量替换 Agent 配置 |

## UI 路由

| 路径            | 页面            | 说明                                                          |
| --------------- | --------------- | ------------------------------------------------------------- |
| `/agent-config` | AgentConfigPage | 5 个 Agent 的完整配置编辑（prompt + temperature + maxTokens） |

## 设计约束

- **classify Agent 特殊参数**：temperature 极低（0.1），maxTokens 极少（50），确保分类稳定
- **prompt 热更新**：保存后主进程下次调用 `getAgentConfig()` 立即生效
- **upsert 语义**：`agent-config:upsert` 执行全量替换，不做深度合并
