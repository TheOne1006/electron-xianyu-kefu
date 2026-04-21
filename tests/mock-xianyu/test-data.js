/**
 * 闲鱼 IM 模拟页面 — 测试数据
 *
 * 预置 4 组会话数据，覆盖讨价还价、商品咨询、系统消息、交易咨询等场景。
 * 所有数据结构与 shared/types.ts 中的接口一致。
 */

const TEST_DATA = {
  /** 商品列表 */
  products: [
    {
      id: '100001',
      title: 'iPhone 15 Pro Max 256G 原石蓝',
      content: '国行正品，电池健康度 96%，无磕碰',
      price: '¥5999',
      images: [
        'https://img.alicdn.com/imgextra/i1/123456/O1CN01abc_600x600.jpg',
        'https://img.alicdn.com/imgextra/i1/123456/O1CN01def_600x600.jpg'
      ],
      mainImageUrl: 'https://img.alicdn.com/imgextra/i1/123456/O1CN01abc_600x600.jpg',
      documentKeys: ['产品介绍模板', '售后说明']
    },
    {
      id: '100002',
      title: 'MacBook Air M2 8+256 午夜色',
      content: '2023年购入，保修到2024年12月，无维修记录',
      price: '¥5499',
      images: [
        'https://img.alicdn.com/imgextra/i2/234567/O1CN01ghi_600x600.jpg'
      ],
      mainImageUrl: 'https://img.alicdn.com/imgextra/i2/234567/O1CN01ghi_600x600.jpg',
      documentKeys: ['售后说明']
    },
    {
      id: '100003',
      title: 'AirPods Pro 2 USB-C 版',
      content: '全新未拆封，2024年10月购入',
      price: '¥1299',
      images: [
        'https://img.alicdn.com/imgextra/i3/345678/O1CN01jkl_600x600.jpg'
      ],
      mainImageUrl: 'https://img.alicdn.com/imgextra/i3/345678/O1CN01jkl_600x600.jpg',
      documentKeys: []
    }
  ],

  /** 会话列表数据 */
  conversations: [
    {
      type: 'user',
      userName: '买家小明',
      lastMessage: '可以便宜点吗？',
      time: '10:30',
      unreadCount: 3,
      itemId: '100001',
      itemImage: 'https://img.alicdn.com/imgextra/i1/123456/O1CN01abc_600x600.jpg',
      tradeStatus: '在售'
    },
    {
      type: 'user',
      userName: '用户张三',
      lastMessage: '成色怎么样？',
      time: '昨天',
      unreadCount: 0,
      itemId: '100002',
      itemImage: 'https://img.alicdn.com/imgextra/i2/234567/O1CN01ghi_600x600.jpg',
      tradeStatus: '在售'
    },
    {
      type: 'system',
      userName: '系统通知',
      lastMessage: '您的商品已被收藏',
      time: '周一',
      unreadCount: 0,
      itemId: null,
      itemImage: '',
      tradeStatus: ''
    },
    {
      type: 'user',
      userName: '用户李四',
      lastMessage: '可以当面交易吗？',
      time: '09:15',
      unreadCount: 1,
      itemId: '100003',
      itemImage: 'https://img.alicdn.com/imgextra/i3/345678/O1CN01jkl_600x600.jpg',
      tradeStatus: '在售'
    }
  ],

  /** 每个会话的消息列表（按 chatId 索引） */
  messages: {
    '100001': [
      { type: 'text', sender: '买家小明', isSelf: false, content: '你好，这个还在吗？' },
      { type: 'text', sender: '我', isSelf: true, content: '在的，品质很好，欢迎咨询' },
      { type: 'text', sender: '买家小明', isSelf: false, content: '可以便宜点吗？' }
    ],
    '100002': [
      { type: 'text', sender: '用户张三', isSelf: false, content: '有划痕吗？' },
      { type: 'text', sender: '我', isSelf: true, content: '没有任何划痕，一直贴膜使用' },
      { type: 'text', sender: '用户张三', isSelf: false, content: '成色怎么样？' }
    ],
    'system': [
      { type: 'text', sender: '系统', isSelf: false, content: '您的商品"iPhone 15 Pro Max"已被收藏' }
    ],
    '100003': [
      { type: 'text', sender: '用户李四', isSelf: false, content: '可以当面交易吗？' },
      { type: 'card', sender: '系统', isSelf: false, content: '', cardInfo: { title: 'AirPods Pro 2 USB-C 版', price: '¥1299', href: '/item?id=100003' } }
    ]
  },

  /** AI 回复队列 — dequeue 时按序返回 */
  replyQueue: [
    { chatId: '100001', replyText: '您好，这款手机目前售价5999元，可以小刀，您出多少？' },
    { chatId: '100002', replyText: '成色非常好，95新以上，一直在保护壳里使用。' },
    { chatId: '100003', replyText: '可以的，我们在同城可以当面交易，您方便在哪个区域？' }
  ],

  /** 文档库 */
  documents: {
    '产品介绍模板': '这是一款高品质的商品，品质保证，欢迎咨询。',
    '售后说明': '感谢您的购买！如有任何问题，请随时联系客服。'
  }
}
