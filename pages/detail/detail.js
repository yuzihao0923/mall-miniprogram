const request = require('../../utils/request.js');
const cart = require('../../utils/cart.js');
const pay = require('../../utils/pay.js');
const env = require('../../config/env.js');
const { formatSales, splitPrice } = require('../../utils/format.js');

const COLLECT_KEY = 'mall_collect_ids';

Page({
  data: {
    goods: null,
    priceParts: {},
    originPriceText: '',
    salesText: '',
    collected: false,
    cartCount: 0,
    current: 0
  },

  onLoad(options) {
    this.goodsId = Number(options.id || 0);
  },

  onShow() {
    this.setData({ cartCount: cart.totalCount() });
    this.loadDetail();
  },

  async loadDetail() {
    const goods = await request.fetchGoodsById(this.goodsId);
    if (!goods) {
      wx.showToast({ title: '商品不存在', icon: 'none' });
      return;
    }
    const collectIds = wx.getStorageSync(COLLECT_KEY) || [];
    this.setData({
      goods,
      priceParts: splitPrice(goods.price),
      originPriceText: goods.originPrice ? splitPrice(goods.originPrice).integer : '',
      salesText: formatSales(goods.sales),
      collected: collectIds.includes(goods.id)
    });
  },

  onBannerChange(e) {
    this.setData({ current: e.detail.current });
  },

  onToggleCollect() {
    const ids = wx.getStorageSync(COLLECT_KEY) || [];
    const { goods, collected } = this.data;
    if (collected) {
      wx.setStorageSync(COLLECT_KEY, ids.filter((id) => id !== goods.id));
    } else {
      ids.push(goods.id);
      wx.setStorageSync(COLLECT_KEY, ids);
    }
    this.setData({ collected: !collected });
    wx.showToast({ title: collected ? '已取消收藏' : '已收藏', icon: 'none' });
  },

  onCartEntry() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  onService() {
    wx.showToast({ title: '客服功能开发中', icon: 'none' });
  },

  onAddCart() {
    const { goods } = this.data;
    cart.add(goods);
    this.setData({ cartCount: cart.totalCount() });
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  async onBuyNow() {
    if (this._buying) return;
    this._buying = true;

    try {
      // mock 演示模式：不走真实支付
      if (env.mockEnabled) {
        wx.showLoading({ title: '模拟支付中…', mask: true });
        await new Promise((r) => setTimeout(r, 800));
        wx.hideLoading();
        wx.showToast({ title: '演示支付成功（mock）', icon: 'none' });
        return;
      }

      // 虚拟支付（道具直购）：productId 需在 MP 后台「道具管理」中与商品一一创建
      wx.showLoading({ title: '创建订单…', mask: true });
      const { outTradeNo } = await pay.buy(this.data.goods, 1, () => wx.hideLoading());
      wx.showModal({
        title: '支付成功',
        content: `订单号：${outTradeNo}\n发货确认后商品将到账`,
        showCancel: false,
        confirmColor: '#FF5000'
      });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e.message || '支付失败', icon: 'none' });
    } finally {
      this._buying = false;
    }
  }
});
