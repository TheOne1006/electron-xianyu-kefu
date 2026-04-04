# 闲鱼客服浏览器 - 设计系统

> 适用于 Electron 桌面工具的专业暗色设计系统

## 1. 设计理念

**工具感 + 专业性** — 这是一个面向技术人员的桌面工具，设计目标是：

- 信息密度高但不杂乱
- 操作路径短，常用功能一眼可见
- 暗色主题减少视觉疲劳（长时间运行场景）
- 统一的设计语言贯穿所有页面

## 2. 配色方案

基于 **Developer Tool / IDE** 色板，适合长时间使用的暗色环境。

### 2.1 语义色 (Semantic Colors)

| 用途      | CSS 变量           | 色值      | 说明                        |
| --------- | ------------------ | --------- | --------------------------- |
| 背景层-1  | `--bg-base`        | `#0F172A` | 页面最底层背景 (Slate 900)  |
| 背景层-2  | `--bg-surface`     | `#1E293B` | 卡片/面板背景 (Slate 800)   |
| 背景层-3  | `--bg-elevated`    | `#334155` | 弹出层/高亮区域 (Slate 700) |
| 前景-主要 | `--text-primary`   | `#F1F5F9` | 标题、正文 (Slate 100)      |
| 前景-次要 | `--text-secondary` | `#94A3B8` | 描述、辅助文字 (Slate 400)  |
| 前景-禁用 | `--text-disabled`  | `#64748B` | 禁用态文字 (Slate 500)      |

### 2.2 品牌色 (Brand Colors)

| 用途     | CSS 变量                | 色值      | 说明                            |
| -------- | ----------------------- | --------- | ------------------------------- |
| 主色     | `--brand-primary`       | `#3B82F6` | 主按钮、链接、选中态 (Blue 500) |
| 主色悬停 | `--brand-primary-hover` | `#2563EB` | 主色悬停态 (Blue 600)           |
| 成功     | `--color-success`       | `#22C55E` | 运行中、已连接 (Green 500)      |
| 危险     | `--color-danger`        | `#EF4444` | 错误、停止 (Red 500)            |
| 警告     | `--color-warning`       | `#F59E0B` | 警告 (Amber 500)                |
| 信息     | `--color-info`          | `#06B6D4` | 提示信息 (Cyan 500)             |

### 2.3 边框与分割

| 用途      | CSS 变量           | 色值      | 说明                 |
| --------- | ------------------ | --------- | -------------------- |
| 边框-默认 | `--border-default` | `#334155` | 卡片边框 (Slate 700) |
| 边框-活跃 | `--border-active`  | `#3B82F6` | 焦点边框 (Blue 500)  |
| 分割线    | `--divider`        | `#1E293B` | 区域分割线           |

## 3. 排版系统

### 3.1 字体栈

```css
--font-sans:
  -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
  'Microsoft YaHei', sans-serif;
--font-mono: 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', monospace;
```

> 优先使用系统字体，无需加载外部字体。中文场景下 PingFang SC 表现最佳。

### 3.2 字号层级

| 层级 | CSS 变量         | 大小 | 行高 | 用途             |
| ---- | ---------------- | ---- | ---- | ---------------- |
| H1   | `--text-h1`      | 20px | 28px | 页面标题         |
| H2   | `--text-h2`      | 16px | 24px | 区块标题         |
| H3   | `--text-h3`      | 14px | 20px | 子区块标题       |
| 正文 | `--text-body`    | 13px | 20px | 主要内容         |
| 辅助 | `--text-caption` | 12px | 16px | 说明文字、标签   |
| 代码 | `--text-code`    | 12px | 18px | 日志、代码编辑器 |

### 3.3 字重

| 用途 | 字重            |
| ---- | --------------- |
| 标题 | 600 (Semi Bold) |
| 正文 | 400 (Regular)   |
| 代码 | 400 (Regular)   |

## 4. 间距系统

基于 4px 基准网格：

| Token       | 值   | 用途                 |
| ----------- | ---- | -------------------- |
| `--space-1` | 4px  | 紧凑内边距           |
| `--space-2` | 8px  | 元素间小间距         |
| `--space-3` | 12px | 输入框内边距         |
| `--space-4` | 16px | 卡片内边距、组件间距 |
| `--space-5` | 20px | 区块间距             |
| `--space-6` | 24px | 大区块间距           |
| `--space-8` | 32px | 页面级间距           |

## 5. 圆角系统

| Token         | 值   | 用途                  |
| ------------- | ---- | --------------------- |
| `--radius-sm` | 4px  | 小元素（标签、Badge） |
| `--radius-md` | 6px  | 输入框、按钮          |
| `--radius-lg` | 8px  | 卡片、面板            |
| `--radius-xl` | 12px | 弹窗、大面板          |

## 6. 阴影系统

| Token         | 值                            | 用途     |
| ------------- | ----------------------------- | -------- |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)`   | 微弱浮起 |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.4)`   | 卡片悬浮 |
| `--shadow-lg` | `0 10px 25px rgba(0,0,0,0.5)` | 弹窗     |

## 7. 布局系统

### 7.1 整体结构

```
┌──────────────────────────────┐
│        顶部标题栏 (48px)       │  ← 固定，含页面标题
├──────────────────────────────┤
│                              │
│        内容区域               │  ← flex: 1, overflow-y: auto
│     (可滚动内容区)            │
│                              │
│                              │
├──────────────────────────────┤
│     底部导航栏 (56px)         │  ← 固定底部
└──────────────────────────────┘
```

### 7.2 内容区最大宽度

- 主内容区: `max-width: 640px`，居中对齐
- 全宽区域（日志等）: `100%`

### 7.3 导航栏

- **顶部标题栏**: 48px 高度，显示当前页面名称
- **底部导航**: 56px 高度，2 个 Tab（Launch / Prompts）
- 导航项使用 SVG 图标 + 文字标签

## 8. 组件规范

### 8.1 按钮

| 类型      | 背景              | 文字             | 边框               | 圆角          |
| --------- | ----------------- | ---------------- | ------------------ | ------------- |
| Primary   | `--brand-primary` | `#fff`           | 无                 | `--radius-md` |
| Secondary | `--bg-elevated`   | `--text-primary` | `--border-default` | `--radius-md` |
| Danger    | `--color-danger`  | `#fff`           | 无                 | `--radius-md` |
| Success   | `--color-success` | `#fff`           | 无                 | `--radius-md` |

- 高度: 36px (小) / 40px (默认) / 44px (大)
- 内边距: 水平 16px
- 悬停: 背景色加深 10%，过渡 150ms
- 禁用: opacity 0.5，cursor: not-allowed

### 8.2 输入框

- 高度: 36px
- 背景: `--bg-elevated`
- 边框: 1px solid `--border-default`
- 焦点边框: `--border-active`
- 内边距: 0 12px
- 圆角: `--radius-md`
- 字号: 13px

### 8.3 卡片

- 背景: `--bg-surface`
- 边框: 1px solid `--border-default`
- 圆角: `--radius-lg`
- 内边距: `--space-4` (16px)
- 间距: `--space-4` (16px)

### 8.4 Tab 栏

- 背景: `--bg-surface`
- 高度: 40px
- 选中态: 底部 2px 实线 `--brand-primary`，文字色 `--brand-primary`
- 未选中态: 文字色 `--text-secondary`
- 悬停: 文字色 `--text-primary`，过渡 150ms

### 8.5 底部导航

- 背景: `--bg-surface`
- 边框: 顶部 1px solid `--border-default`
- 高度: 56px
- 选中态: 图标 + 文字使用 `--brand-primary`
- 未选中态: 图标 + 文字使用 `--text-secondary`
- 图标: 20px，文字: 12px

### 8.6 日志面板

- 背景: `#0D1117` (比页面背景更深)
- 字体: `--font-mono`，字号: `--text-code` (12px)
- 行高: 1.6
- 颜色映射:
  - info: `--text-secondary`
  - warn: `--color-warning`
  - error: `--color-danger`
  - debug: `--text-disabled`

## 9. 动效规范

| 场景     | 时长  | 缓动        |
| -------- | ----- | ----------- |
| 悬停反馈 | 150ms | ease        |
| 状态切换 | 200ms | ease-in-out |
| 页面过渡 | 250ms | ease-in-out |

- 尊重 `prefers-reduced-motion`
- 不使用 layout shift 动画
- 不使用 scale 变换导致的位移

## 10. 页级差异说明

### LaunchPage (启动页)

- 居中布局，`max-width: 640px`
- 顶部标题栏显示 "闲鱼客服"
- 配置表单使用卡片包裹
- 操作按钮组（启动浏览器 / 自动回复）紧凑排列
- 状态信息使用 Badge 样式
- 日志面板全宽展示

### PromptsPage (提示词页)

- 顶部 Tab 栏固定
- 编辑器占满剩余空间
- 重置按钮使用 Secondary 样式
- 编辑器使用等宽字体、深色背景

## 11. 文件结构

```
src/renderer/src/
├── assets/
│   ├── base.css          ← 设计 Token (CSS 变量)
│   └── main.css          ← 全局重置和通用样式
├── components/
│   ├── BottomNav.tsx      ← 底部导航
│   ├── ConfigForm.tsx     ← 配置表单
│   ├── PromptEditor.tsx   ← 提示词编辑器
│   ├── ProductEditor.tsx  ← 产品数据编辑器
│   └── Versions.tsx       ← 版本信息
├── pages/
│   ├── LaunchPage.tsx     ← 启动页
│   └── PromptsPage.tsx    ← 提示词页
├── App.tsx                ← 根组件
└── main.tsx               ← 入口
```
