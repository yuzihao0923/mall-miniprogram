const cart = require('../../utils/cart.js');
const { splitPrice } = require('../../utils/format.js');

Page({
  data: {
    items: [],
    total: '0',
    count: 0,
    allSelected: false
  },

  onShow() {
    this.refresh();
  },

  /** 从购物车服务刷新整页数据 */
  refresh() {
    const items = cart.list().map((it) => ({
      ...it,
      priceParts: splitPrice(it.price),
      lineTotal: (Math.round(it.price * it.num * 100) / 100).toFixed(2)
    }));
    const summary = cart.selectedSummary();
    this.setData({
      items,
      total: summary.total.toFixed(2),
      count: summary.count,
      allSelected: summary.allSelected
    });
  },

  onToggleSelect(e) {
    const { id, spec } = e.currentTarget.dataset;
    const item = this.data.items.find((it) => it.id === id && it.spec === spec);
    cart.setSelected(id, spec, !item.selected);
    this.refresh();
  },

  onToggleAll() {
    cart.setAllSelected(!this.data.allSelected);
    this.refresh();
  },

  onMinus(e) {
    const { id, spec, num } = e.currentTarget.dataset;
    if (num <= 1) return;
    cart.updateNum(id, spec, num - 1);
    this.refresh();
  },

  onPlus(e) {
    const { id, spec, num } = e.currentTarget.dataset;
    cart.updateNum(id, spec, num + 1);
    this.refresh();
  },

  onRemove(e) {
    const { id, spec, title } = e.currentTarget.dataset;
    wx.showModal({
      title: '移除商品',
      content: `确定将「${title}」移出购物车吗？`,
      confirmColor: '#FF5000',
      success: (res) => {
        if (res.confirm) {
          cart.remove(id, spec);
          this.refresh();
        }
      }
    });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  onCheckout() {
    if (!this.data.count) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    wx.showToast({ title: '下单功能开发中，敬请期待', icon: 'none' });
  }
});
