/**
 * 闲鱼 IM 模拟页面 — 控制器
 *
 * MockIM 全局对象，提供 DOM 操作 API。
 * 支持动态添加消息、切换会话、模拟未读状态等操作。
 *
 * 依赖：test-data.js 先于本文件加载
 */
;(function () {
  const _state = {
    activeConversationIndex: 0,
    conversations: JSON.parse(JSON.stringify(TEST_DATA.conversations)),
    messages: JSON.parse(JSON.stringify(TEST_DATA.messages)),
    _onMessageSent: null
  }

  // ─── 内部工具函数 ────────────────────────────────────────

  function getConversationEl(index) {
    const items = document.querySelectorAll('div[class*="conversation-item--"]')
    return items[index] || null
  }

  function getMessageListEl() {
    return document.querySelector('ul.ant-list-items')
  }

  function createAvatarEl(text) {
    const div = document.createElement('div')
    div.className = 'avatar--mock'
    div.textContent = text || '?'
    return div
  }

  function createMessageRowEl(message) {
    const row = document.createElement('div')
    row.className = 'message-row--mock ' + (message.isSelf ? 'self' : 'other')

    const avatar = createAvatarEl(message.isSelf ? '我' : message.sender?.charAt(0) || '?')

    // 内容容器：包含 sender div + message-text div
    // 匹配 ImDomExtractor 的 sender 提取逻辑：
    //   avatarEl.nextElementSibling.querySelector('div')
    const contentWrapper = document.createElement('div')
    const senderDiv = document.createElement('div')
    senderDiv.textContent = message.sender || ''
    contentWrapper.appendChild(senderDiv)

    const textDiv = document.createElement('div')
    textDiv.className = 'message-text--mock'
    const span = document.createElement('span')
    span.textContent = message.content || ''
    textDiv.appendChild(span)
    contentWrapper.appendChild(textDiv)

    if (message.isSelf) {
      row.appendChild(contentWrapper)
      row.appendChild(avatar)
    } else {
      row.appendChild(avatar)
      row.appendChild(contentWrapper)
    }

    return row
  }

  function createCardMessageEl(message) {
    const row = document.createElement('div')
    row.className = 'message-row--mock other'

    const avatar = createAvatarEl(message.sender?.charAt(0) || '?')

    const link = document.createElement('a')
    link.href = message.cardInfo?.href || '#'
    const card = document.createElement('div')
    card.className = 'card--mock'

    if (message.cardInfo?.title) {
      const title = document.createElement('div')
      title.className = 'title--mock'
      title.textContent = message.cardInfo.title
      card.appendChild(title)
    }
    if (message.cardInfo?.price) {
      const price = document.createElement('div')
      price.className = 'price--mock'
      price.textContent = message.cardInfo.price
      card.appendChild(price)
    }
    if (message.cardInfo?.content || message.content) {
      const content = document.createElement('div')
      content.className = 'content--mock'
      content.textContent = message.cardInfo?.content || message.content || ''
      card.appendChild(content)
    }

    link.appendChild(card)
    row.appendChild(avatar)
    row.appendChild(link)

    return row
  }

  function createImageMessageEl(message) {
    const row = document.createElement('div')
    row.className = 'message-row--mock ' + (message.isSelf ? 'self' : 'other')

    const avatar = createAvatarEl(message.isSelf ? '我' : message.sender?.charAt(0) || '?')

    const imgDiv = document.createElement('div')
    imgDiv.className = 'message-image--mock'
    const img = document.createElement('img')
    img.src = message.imageUrl || ''
    img.alt = '图片'
    imgDiv.appendChild(img)

    if (message.isSelf) {
      row.appendChild(imgDiv)
      row.appendChild(avatar)
    } else {
      row.appendChild(avatar)
      row.appendChild(imgDiv)
    }

    return row
  }

  function renderConversationList() {
    const listEl = document.querySelector('.conversation-list--mock')
    if (!listEl) return

    listEl.innerHTML = ''

    _state.conversations.forEach(function (conv, index) {
      const item = document.createElement('div')
      item.className = 'conversation-item--mock ant-dropdown-trigger'
      if (conv.type === 'system') {
        item.className += ' system-item'
      }
      if (index === _state.activeConversationIndex) {
        item.className += ' active'
      }

      // 内部结构匹配 getChatList 的遍历逻辑
      const dropdown = document.createElement('div')
      dropdown.className = 'ant-dropdown-trigger'

      const infoDiv = document.createElement('div')

      // 第一列：avatar 区域
      const avatarArea = document.createElement('div')
      if (conv.unreadCount > 0) {
        const badge = document.createElement('sup')
        badge.className = 'ant-scroll-number'
        badge.setAttribute('title', String(conv.unreadCount))
        badge.textContent = String(conv.unreadCount)
        avatarArea.appendChild(badge)
      }

      // 第二列：内容
      const colContainer = document.createElement('div')

      // children[0]
      const col0 = document.createElement('div')

      // children[1]: 用户名 + 交易状态
      const col1 = document.createElement('div')
      const nameDiv = document.createElement('div')
      nameDiv.textContent = conv.userName
      col1.appendChild(nameDiv)
      if (conv.tradeStatus) {
        const statusSpan = document.createElement('span')
        statusSpan.textContent = conv.tradeStatus
        col1.appendChild(statusSpan)
      }

      // children[2]: 最近消息
      const col2 = document.createElement('div')
      col2.textContent = conv.lastMessage

      // children[3]: 时间
      const col3 = document.createElement('div')
      col3.textContent = conv.time

      colContainer.appendChild(col0)
      colContainer.appendChild(col1)
      colContainer.appendChild(col2)
      colContainer.appendChild(col3)

      infoDiv.appendChild(avatarArea)
      infoDiv.appendChild(colContainer)

      dropdown.appendChild(infoDiv)

      // 商品图片（排除 badge 和 order 图标）
      if (conv.itemImage) {
        const img = document.createElement('img')
        img.src = conv.itemImage
        img.alt = ''
        dropdown.appendChild(img)
      }

      // 系统消息添加 reminder 图标
      if (conv.type === 'system') {
        const reminder = document.createElement('img')
        reminder.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'
        reminder.alt = 'reminder'
        dropdown.appendChild(reminder)
      }

      item.appendChild(dropdown)

      // 点击切换会话
      item.addEventListener('click', function () {
        MockIM.selectConversation(index)
      })

      listEl.appendChild(item)
    })
  }

  function renderMessages(chatId) {
    const listEl = getMessageListEl()
    if (!listEl) return

    listEl.innerHTML = ''

    const msgs = _state.messages[chatId] || []
    msgs.forEach(function (msg) {
      const li = document.createElement('li')
      li.className = 'ant-list-item'

      if (msg.type === 'card') {
        li.appendChild(createCardMessageEl(msg))
      } else if (msg.type === 'image') {
        li.appendChild(createImageMessageEl(msg))
      } else {
        li.appendChild(createMessageRowEl(msg))
      }

      listEl.appendChild(li)
    })
  }

  function renderChatHeader(conv) {
    const headerEl = document.querySelector('.conv-header--mock')
    if (!headerEl) return

    headerEl.innerHTML = ''

    const nameSpan = document.createElement('span')
    nameSpan.className = 'text1--mock'
    nameSpan.textContent = conv.userName
    headerEl.appendChild(nameSpan)

    if (conv.itemId) {
      const link = document.createElement('a')
      link.href = '/item?id=' + conv.itemId
      link.textContent = '查看商品'
      headerEl.appendChild(link)
    }

    // 在聊天头部渲染未读标记（匹配 hasUnreadMessages 的选择器）
    if (conv.unreadCount > 0) {
      const badge = document.createElement('sup')
      badge.className = 'ant-scroll-number'
      badge.setAttribute('title', String(conv.unreadCount))
      badge.textContent = String(conv.unreadCount)
      badge.style.marginLeft = '8px'
      headerEl.appendChild(badge)
    }
  }

  function updateConversationLastMessage(chatId) {
    const msgs = _state.messages[chatId]
    if (!msgs || msgs.length === 0) return

    const lastMsg = msgs[msgs.length - 1]
    const conv = _state.conversations.find(function (c) {
      return c.itemId === chatId || (chatId === 'system' && c.type === 'system')
    })
    if (conv) {
      conv.lastMessage = lastMsg.content || '[卡片]' || '[图片]'
    }
  }

  // ─── 公开 API ────────────────────────────────────────────

  window.MockIM = {
    // 会话管理
    setConversations: function (conversations) {
      _state.conversations = conversations
      renderConversationList()
    },

    selectConversation: function (index) {
      if (index < 0 || index >= _state.conversations.length) return

      // 移除旧的 active
      const oldActive = getConversationEl(_state.activeConversationIndex)
      if (oldActive) oldActive.classList.remove('active')

      _state.activeConversationIndex = index
      const conv = _state.conversations[index]

      // 设置新的 active
      const newActive = getConversationEl(index)
      if (newActive) newActive.classList.add('active')

      // 更新右侧聊天
      renderChatHeader(conv)
      renderMessages(conv.itemId || 'system')
    },

    // 消息操作
    addMessage: function (options) {
      const conv = _state.conversations[_state.activeConversationIndex]
      const chatId = conv ? conv.itemId || 'system' : null
      if (!chatId) return

      if (!_state.messages[chatId]) {
        _state.messages[chatId] = []
      }

      const msg = {
        type: options.type || 'text',
        sender: options.sender || (options.isSelf ? '我' : conv.userName),
        isSelf: !!options.isSelf,
        content: options.content || '',
        cardInfo: options.cardInfo,
        imageUrl: options.imageUrl
      }

      _state.messages[chatId].push(msg)
      updateConversationLastMessage(chatId)
      renderConversationList()

      // 如果当前显示的是这个会话，追加消息到 DOM
      const listEl = getMessageListEl()
      if (listEl) {
        const li = document.createElement('li')
        li.className = 'ant-list-item'

        if (msg.type === 'card') {
          li.appendChild(createCardMessageEl(msg))
        } else if (msg.type === 'image') {
          li.appendChild(createImageMessageEl(msg))
        } else {
          li.appendChild(createMessageRowEl(msg))
        }

        listEl.appendChild(li)
        // 滚动到底部
        listEl.parentElement.scrollTop = listEl.parentElement.scrollHeight
      }
    },

    addMessages: function (messages) {
      messages.forEach(function (msg) {
        MockIM.addMessage(msg)
      })
    },

    clearMessages: function () {
      const conv = _state.conversations[_state.activeConversationIndex]
      if (!conv) return

      const chatId = conv.itemId || 'system'
      _state.messages[chatId] = []

      const listEl = getMessageListEl()
      if (listEl) listEl.innerHTML = ''
    },

    // 未读状态
    setUnread: function (conversationIndex, count) {
      const conv = _state.conversations[conversationIndex]
      if (!conv) return

      conv.unreadCount = count
      renderConversationList()
    },

    clearUnread: function (conversationIndex) {
      MockIM.setUnread(conversationIndex, 0)
    },

    // 输入框
    setInputValue: function (text) {
      const input = document.querySelector('textarea.ant-input')
      if (input) {
        input.value = text
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    },

    getInputValue: function () {
      const input = document.querySelector('textarea.ant-input')
      return input ? input.value : ''
    },

    // 快捷场景
    simulateIncomingMessage: function (text) {
      const conv = _state.conversations[_state.activeConversationIndex]
      if (!conv) return

      MockIM.addMessage({
        sender: conv.userName,
        isSelf: false,
        type: 'text',
        content: text
      })

      // 如果当前会话之前没有未读，设置未读
      if (conv.unreadCount === 0) {
        MockIM.setUnread(_state.activeConversationIndex, 1)
      } else {
        MockIM.setUnread(_state.activeConversationIndex, conv.unreadCount + 1)
      }
    },

    simulateUserTyping: function (text) {
      MockIM.setInputValue(text)
    },

    // 事件回调
    onMessageSent: function (callback) {
      _state._onMessageSent = callback
    },

    // 调试
    getCallLog: function () {
      return window.__mockCallLog || []
    },

    clearCallLog: function () {
      if (window.__mockCallLog) {
        window.__mockCallLog.length = 0
      }
    }
  }

  // ─── 初始化渲染 ─────────────────────────────────────────
  // DOMContentLoaded 后自动渲染
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderConversationList()
      if (_state.conversations.length > 0) {
        MockIM.selectConversation(0)
      }
    })
  } else {
    renderConversationList()
    if (_state.conversations.length > 0) {
      MockIM.selectConversation(0)
    }
  }
})()
