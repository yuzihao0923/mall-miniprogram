Page({
  data: {
    orders: [
      { icon: '💰', name: '待付款' },
      { icon: '📦', name: '待发货' },
      { icon: '🚚', name: '待收货' },
      { icon: '⭐', name: '待评价' },
      { icon: '↩️', name: '退款/售后' }
    ],
    tools: [
      { icon: '❤️', name: '我的收藏' },
      { icon: '👀', name: '浏览足迹' },
      { icon: '🎟️', name: '优惠券' },
      { icon: '🎁', name: '会员福利' },
      { icon: '📍', name: '收货地址' },
      { icon: '💬', name: '联系客服' },
      { icon: '⚙️', name: '设置' },
      { icon: 'ℹ️', name: '关于' }
    ]
  },

  onTodoTap() {
    wx.showToast({ title: '功能开发中，敬请期待', icon: 'none' });
  }
});
