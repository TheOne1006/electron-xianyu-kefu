# Data Model: 会话列表 UI 布局优化

**Feature**: 002-conversations-ui-polish
**Date**: 2026-04-22

## Overview

本功能不引入新的持久化数据类型。变更限于渲染进程的内存数据结构和组件 props。

## Existing Entities (Unchanged)

### Product

来自 `@shared/types`。在 ConversationsPage 中通过 `window.electron.product.list()` 加载全量数据。

| Field          | Type     | Description              |
| -------------- | -------- | ------------------------ |
| id             | string   | 产品 ID（= ChatInfo.itemId） |
| title          | string   | 产品标题                  |
| mainImageUrl   | string   | 主图 URL（取自 images[0]）  |
| images         | string[] | 全部图片 URL              |
| ...            |          | 其他字段（本功能不使用）    |

### Conversation

来自 `@shared/types`。通过 `window.electron.conversation.list()` 获取列表。

| Field     | Type          | Description            |
| --------- | ------------- | ---------------------- |
| chatInfo  | ChatInfo      | 会话信息               |
| messages  | ChatMessage[] | 消息列表               |

### ChatInfo

| Field       | Type            | Description                    |
| ----------- | --------------- | ------------------------------ |
| userName    | string          | 对方用户名                      |
| itemId      | string \| null  | 关联商品 ID（可映射到 Product.id） |
| isMyProduct | boolean         | 是否为自己的商品                |

## New In-Memory Structures

### Products Index (ConversationsPage state)

```typescript
// ConversationsPage 内部维护
const productsMap = useMemo(() => {
  const map = new Map<string, Product>()
  products.forEach((p) => map.set(p.id, p))
  return map
}, [products])
```

**用途**: SessionList 通过 `productsMap.get(chatInfo.itemId)` 获取商品主图 URL。

### ResizableSplit State

```typescript
// ConversationsPage 内部维护
const [leftWidth, setLeftWidth] = useState(280) // 初始 280px
```

**约束**: `leftWidth >= 200`（列表最小宽度），右侧自动填充剩余空间。

## Component Props Changes

### SessionList Props

```typescript
interface SessionListProps {
  sessions: Conversation[]
  selectedId: string | null
  onSelect: (chatId: string) => void
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  onDelete?: (chatId: string) => void
  products: Map<string, Product>  // 新增：用于查找商品主图
}
```

### ResizableSplit Props (New Component)

```typescript
interface ResizableSplitProps {
  left: React.ReactNode
  right: React.ReactNode
  leftWidth: number                       // 受控：左侧面板宽度
  onLeftWidthChange: (width: number) => void
  minLeftWidth?: number                   // 默认 200
}
```

## Data Flow

```
ConversationsPage
  │
  ├─ window.electron.product.list() → Product[]
  │     └─ useMemo → Map<string, Product>
  │           └─ 传给 SessionList (props.products)
  │
  ├─ window.electron.conversation.list() → Conversation[]
  │     └─ 传给 SessionList (props.sessions)
  │
  ├─ ResizableSplit
  │     ├─ left: SessionList
  │     └─ right: MessageList + Input (或空状态)
  │
  └─ leftWidth state → 传给 ResizableSplit (props.leftWidth)
```
