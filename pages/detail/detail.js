const request = require('../../utils/request.js');
const cart = require('../../utils/cart.js');
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

  onBuyNow() {
    wx.showToast({ title: '下单功能开发中，敬请期待', icon: 'none' });
  }
});
