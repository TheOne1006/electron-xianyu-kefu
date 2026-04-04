# Module: Product Store

> 商品目录管理 — 商品信息的采集、存储、查询

## 跨层文件

```
src/shared/types.ts                     # Product 接口
src/main/stores/product-store.ts        # 数据持久化（electron-store name='products'）
src/main/stores/helper.ts               # safeId() ID 清洗工具
src/main/ipc-handlers.ts                # product:list / getById / create / deleteById
src/main/business/agent.ts              # 查询商品信息用于 LLM prompt 构建
src/preload/index.ts                    # 暴露 products.list/getById/add/delete
src/renderer/src/pages/ProductsPage.tsx # 商品管理页面（表格布局）
src/renderer/src/components/ProductEditor.tsx  # JSON 编辑器
src/injected/product-helpers/index.ts   # DOM 提取（extractProductFromDOM）
src/injected/message-handler/product-collector.ts  # 采集按钮 + IPC 上传（page-agent 已移除）
src/injected/message-handler/routers/item-router.ts # 商品页路由
src/injected/ipc/channels.ts            # PRODUCTS_* 通道常量
src/shared/defaults/products/001.json   # 示例商品
```

## 数据流

```
┌─ 注入层（商品采集）─────────────────────────────────────────┐
│                                                              │
│  路径 A：自动采集                                             │
│  item-router.ts → extractProductFromDOM()                    │
│       │ → window.__electronIPC.invoke('product:upsert') │
│                                                              │
│  路径 B：手动采集                                             │
│  product-collector.ts → 「📦 收集产品」按钮                   │
│       │ → window.collectProduct()                            │
│       │ → window.__electronIPC.invoke('product:upsert') │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼─────── 主进程 ──────────────────────────────────────┐
│  ipc-handlers.ts                                            │
│  product:upsert       → createOrUpdateProduct(product)      │
│  product:list         → listProducts()                       │
│  product:getById      → getProduct(id)                       │
│  product:deleteById   → deleteProduct(id)                    │
│                                                              │
│  下游消费者：                                                │
│  agent.ts → getProductInfoById(itemId)                       │
│    → 注入到 LLM system prompt 中，提供商品上下文              │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼─────── 渲染进程（商品管理）──────────────────────────┐
│  ProductsPage.tsx（表格布局）                                 │
│  加载：products.list() → 展示商品列表                         │
│  添加：products.add(product) → 弹窗表单                       │
│  编辑：ProductEditor → JSON 格式编辑 + 校验                   │
│  删除：products.delete(id) → 确认弹窗                        │
└──────────────────────────────────────────────────────────────┘
```

## Product 数据结构

```typescript
interface Product {
  id: string // 商品 ID（从 URL ?id= 提取）
  title: string // 商品标题
  content?: string // 商品描述
  priceStrategy?: string // 价格策略描述
  stock?: number // 库存数量
  price?: string // 价格字符串（如 "¥8.8 - ¥35.6"）
  images?: string[] // 商品图片 URLs
  [key: string]: string | number | string[] | undefined // 扩展属性
}
```

## 关键函数

| 层          | 函数                                | 说明                          |
| ----------- | ----------------------------------- | ----------------------------- |
| main/store  | `createOrUpdate(product)`           | 创建或更新商品                |
| main/store  | `getById(id): Product \| undefined` | 按 ID 查询                    |
| main/store  | `list(): Product[]`                 | 列出全部商品                  |
| main/store  | `deleteById(id)`                    | 删除商品                      |
| main/helper | `safeId(id: string): string`        | ID 清洗（去除特殊字符）       |
| main/agent  | `getProductInfoById(itemId)`        | Agent 查询商品用于构建 prompt |
| injected    | `extractProductFromDOM()`           | 从闲鱼商品页 DOM 提取数据     |
| injected    | `window.collectProduct()`           | 全局函数，供按钮调用          |
| preload     | `products.list/getById/add/delete`  | 桥接渲染进程                  |

## 设计约束

- **ID 来源**：商品 ID 从页面 URL 的 `?id=` 参数提取
- **扩展属性**：Product 接口支持动态属性 `[key: string]`，适配不同商品类型
- **双重入口**：商品数据可从注入层自动/手动采集，也可在渲染进程手动添加
- **Agent 集成**：`agent.ts` 在处理消息时自动查询关联商品（通过 `chatInfo.itemId`），将商品信息注入 LLM prompt
