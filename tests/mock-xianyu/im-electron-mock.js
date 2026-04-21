/**
 * 闲鱼 IM 模拟页面 — Electron API Mock
 *
 * 模拟 window.electronAPI 和 window.__electronIPC，
 * 让注入脚本在模拟页面上运行时认为自己在真实的 Electron 环境中。
 */

;(function () {
  // ─── 调用日志 ─────────────────────────────────────────────
  const _callLog = []

  function logCall(api, method, args, result) {
    _callLog.push({
      api,
      method,
      args: JSON.parse(JSON.stringify(args)),
      result: result !== undefined ? JSON.parse(JSON.stringify(result)) : undefined,
      timestamp: Date.now()
    })
  }

  // ─── 回复队列指针 ────────────────────────────────────────
  let _replyIndex = 0

  // ─── IpcResult 工厂 ───────────────────────────────────────
  function ok(data) {
    return { code: 0, message: '', data }
  }

  function err(code, message) {
    return { code, message, data: null }
  }

  // ─── window.__electronIPC ────────────────────────────────
  window.__electronIPC = {
    send(channel, data) {
      logCall('__electronIPC', 'send', [channel, data], null)
    },

    async invoke(channel, data) {
      logCall('__electronIPC', 'invoke', [channel, data], undefined)

      switch (channel) {
        case 'conversation:upsert':
          return ok(data)
        case 'reply-queue:dequeue': {
          if (_replyIndex < TEST_DATA.replyQueue.length) {
            const reply = TEST_DATA.replyQueue[_replyIndex++]
            return ok(reply)
          }
          return ok(null)
        }
        case 'product:upsert':
          return ok(data)
        default:
          return ok(null)
      }
    }
  }

  // ─── window.electronAPI ──────────────────────────────────
  window.electronAPI = {
    // 模拟操作
    async simulateClick(x, y) {
      logCall('electronAPI', 'simulateClick', [x, y], { success: true })
      return ok({ success: true })
    },

    async simulateChineseInput(text) {
      logCall('electronAPI', 'simulateChineseInput', [text], { success: true })
      // 设置输入框内容
      const input = document.querySelector('textarea.ant-input')
      if (input) {
        input.value = text
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      return ok({ success: true })
    },

    async simulateEnterKey(x, y) {
      logCall('electronAPI', 'simulateEnterKey', [x, y], { success: true })
      // 触发消息发送回调
      if (typeof MockIM !== 'undefined' && MockIM._onMessageSent) {
        const input = document.querySelector('textarea.ant-input')
        MockIM._onMessageSent(input ? input.value : '')
      }
      return ok({ success: true })
    },

    // 回复队列
    replyQueue: {
      async dequeue() {
        if (_replyIndex < TEST_DATA.replyQueue.length) {
          const reply = TEST_DATA.replyQueue[_replyIndex++]
          logCall('electronAPI', 'replyQueue.dequeue', [], reply)
          return ok(reply)
        }
        logCall('electronAPI', 'replyQueue.dequeue', [], null)
        return ok(null)
      }
    },

    // 对话操作
    conversation: {
      async upsert(chatInfo, messages) {
        logCall('electronAPI', 'conversation.upsert', [chatInfo, messages], null)
        return ok({ chatInfo, messages })
      },

      async getById(chatId) {
        logCall('electronAPI', 'conversation.getById', [chatId], null)
        const msgs = TEST_DATA.messages[chatId]
        if (msgs) {
          const conv = TEST_DATA.conversations.find(
            (c) => c.itemId === chatId || (chatId === 'system' && c.type === 'system')
          )
          return ok({
            chatInfo: conv
              ? { userName: conv.userName, itemId: conv.itemId, isMyProduct: true }
              : { userName: '未知', itemId: null, isMyProduct: false },
            messages: msgs
          })
        }
        return ok(null)
      }
    },

    // 商品操作
    product: {
      async upsert(product) {
        logCall('electronAPI', 'product.upsert', [product], product)
        return ok(product)
      },

      async list() {
        logCall('electronAPI', 'product.list', [], TEST_DATA.products)
        return ok(TEST_DATA.products)
      }
    }
  }

  // ─── 调试 API（挂到 window 上） ────────────────────────
  window.__mockCallLog = _callLog
})()
