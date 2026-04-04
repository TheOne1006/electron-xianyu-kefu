# 闲鱼浏览器窗口生命周期管理

## 背景

当前闲鱼浏览器窗口（XYBrowserWindow）存在三个问题：

1. 函数命名不清晰 — `createBrowserWindow` 无法区分是通用窗口还是闲鱼专用窗口
2. 渲染进程无法感知闲鱼浏览器窗口的启动/关闭状态 — 「启动浏览器」按钮无法反映实际状态，用户可能重复启动
3. 主窗口关闭时闲鱼浏览器窗口不会联动关闭，残留孤窗

## 设计

### 1. browser.ts — 重命名 + 窗口状态管理

- `createBrowserWindow` 重命名为 `createXYBrowserWindow`，所有 import 同步更新
- 新增 `notifyMainWindow(status: 'running' | 'closed')` 函数 — 通过 `getMainWindow().webContents.send('xy-browser:status', status)` 向主窗口推送状态
- 窗口创建完成后调用 `notifyMainWindow('running')`
- 监听窗口 `close` 事件：清空 `browserWindowInstance` 引用 + 调用 `notifyMainWindow('closed')`
- 新增 `closeXYBrowserWindow()` 函数 — 关闭窗口并清理引用
- 新增 `isXYBrowserRunning(): boolean` — 返回窗口是否存活

### 2. IPC 通道 + Preload 桥接

**新增通道（`xy-browser:` 前缀）：**

| 通道 | 方向 | 说明 |
|------|------|------|
| `xy-browser:launch` | renderer → main | 启动闲鱼浏览器（原 `browser:launch` 重命名） |
| `xy-browser:status` | main → renderer | 状态事件推送（`'running'` / `'closed'`） |
| `xy-browser:close` | renderer → main | 渲染进程请求关闭闲鱼窗口 |
| `xy-browser:getStatus` | renderer → main | 查询当前状态（页面刷新后恢复） |

**ipc-handlers.ts 改动：**
- `browser:launch` → `xy-browser:launch`，import 改为 `createXYBrowserWindow`
- 新增 `xy-browser:close` handler → 调用 `closeXYBrowserWindow()`
- 新增 `xy-browser:getStatus` handler → 返回 `isXYBrowserRunning()`

**preload/index.ts 改动：**
- `browser` 命名空间改为 `xyBrowser`
- `launch` 对应 `xy-browser:launch`
- 新增 `close()` → `xy-browser:close`
- 新增 `getStatus()` → `xy-browser:getStatus`
- 新增 `onStatusChange(callback)` → 监听 `xy-browser:status`，返回 unsubscribe 函数

### 3. AppHeader.tsx — 按钮状态切换

- 新增 `xyRunning` state，初始值通过 `xyBrowser.getStatus()` 恢复
- `useEffect` 注册 `xyBrowser.onStatusChange(setXyRunning)` 监听，cleanup 时 unsubscribe
- 按钮三种状态：
  - `xyRunning=false, launching=false` → 橙色渐变「启动浏览器」，点击走 launch 流程
  - `launching=true` → 灰色「启动中...」
  - `xyRunning=true` → 红色「关闭浏览器」，点击调用 `xyBrowser.close()`

### 4. 主窗口关闭联动

在 `main/index.ts` 的 `createMainWindow()` 中：

```ts
mainWindow.on('close', () => {
  closeXYBrowserWindow()
})
```

`closeXYBrowserWindow()` 内部判断窗口是否存在，不存在则 no-op。

## 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `src/main/browser.ts` | 重命名 + 新增状态管理函数 |
| `src/main/ipc-handlers.ts` | 通道重命名 + 新增 handler |
| `src/main/index.ts` | 主窗口 close 联动 + import 更新 |
| `src/preload/index.ts` | API 命名空间重命名 + 新增方法 |
| `src/renderer/src/components/AppHeader.tsx` | 状态监听 + 按钮切换 |
| `src/preload/index.d.ts` | 类型声明同步更新 |
