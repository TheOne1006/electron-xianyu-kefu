/**
 * E2E 测试 Harness — 拦截 ImRobot 定时器
 *
 * 此脚本必须在 injected.bundle.js 注入之前执行。
 * 它会 monkey-patch setInterval，捕获 ImRobot 创建的 30s 兜底定时器，
 * 替换为 500ms 短间隔，同时暴露 tick 控制接口。
 *
 * 使用方式（在 fixture 中按顺序执行）：
 *   1. history.pushState → 设置 pathname
 *   2. 执行本 harness 代码 → 拦截 setInterval
 *   3. 注入 injected.bundle.js → ImRobot start() 被拦截
 *   4. 操作 MockIM → 等待 tick（500ms）
 */

;(function () {
  const _originalSetInterval = window.setInterval
  let _capturedTickFn = null

  // Monkey-patch setInterval
  window.setInterval = function (fn, delay, ...args) {
    // ImRobot 的兜底轮询间隔是 30 * 1000 = 30000ms（旧版本为 10s）
    if (delay === 30000 || delay === 30 * 1000 || delay === 10000 || delay === 10 * 1000) {
      // 用 500ms 替代
      _capturedTickFn = fn
      return _originalSetInterval.call(window, fn, 500, ...args)
    }
    return _originalSetInterval.call(window, fn, delay, ...args)
  }

  // 暴露测试 API
  window.__testRobot = {
    /** 手动触发一次 tick */
    async triggerTick() {
      if (_capturedTickFn) {
        await _capturedTickFn()
      }
    },
    /** 手动触发一次 DOM 变化检测（等同于 triggerTick） */
    async triggerDomChange() {
      if (_capturedTickFn) {
        await _capturedTickFn()
      }
    },
    /** 获取 mockCallLog */
    getCallLog() {
      return window.__mockCallLog || []
    },
    /** 清空 callLog */
    clearCallLog() {
      if (window.__mockCallLog) {
        window.__mockCallLog.length = 0
      }
    },
    /** 获取 MockIM */
    get mockIM() {
      return window.MockIM
    }
  }

  window.__testHarness = true
})()
