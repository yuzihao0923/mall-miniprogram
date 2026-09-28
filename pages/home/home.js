const request = require('../../utils/request.js');
const mock = require('../../data/goods.js');

/** 瀑布流卡片高度预估（rpx）：图片按比例 + 文字区按行数 */
function estimateHeight(goods) {
  const img = 345 * (goods.ratio || 1);
  const lines = Math.min(2, Math.ceil((goods.title || '').length / 11));
  const text = Math.max(2, lines) * 38 + 12 + 46 + 40 + 36;
  return img + text;
}

Page({
  data: {
    banners: [],
    kingkong: [],
    chips: [],
    activeCategory: 'all',
    leftList: [],
    rightList: [],
    hasMore: true,
    loading: false
  },

  page: 1,
  colHeight: { left: 0, right: 0 },

  onLoad() {
    this.setData({
      kingkong: mock.kingkongList,
      chips: [{ id: 'all', name: '推荐' }].concat(mock.categories)
    });
    this.loadBanners();
    this.reload();
  },

  async loadBanners() {
    const banners = await request.fetchBanners();
    this.setData({ banners });
  },

  /** 重置并加载第一页 */
  async reload() {
    this.page = 1;
    this.colHeight = { left: 0, right: 0 };
    this.setData({ leftList: [], rightList: [], hasMore: true });
    await this.loadPage();
  },

  async loadPage() {
    if (this.data.loading || !this.data.hasMore) return;
    this.setData({ loading: true });
    const { activeCategory } = this.data;
    const res = await request.fetchGoods({ category: activeCategory, page: this.page });
    const leftList = this.data.leftList.slice();
    const rightList = this.data.rightList.slice();

    res.list.forEach((goods) => {
      if (this.colHeight.left <= this.colHeight.right) {
        leftList.push(goods);
        this.colHeight.left += estimateHeight(goods);
      } else {
        rightList.push(goods);
        this.colHeight.right += estimateHeight(goods);
      }
    });

    this.setData({ leftList, rightList, hasMore: res.hasMore, loading: false });
    this.page += 1;
  },

  onPullDownRefresh() {
    this.reload().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadPage();
  },

  onShareAppMessage() {
    return { title: '好逛商城 — 好物都在这里', path: '/pages/home/home' };
  },

  /* ===== 事件 ===== */

  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  onBannerTap(e) {
    const banner = this.data.banners[e.currentTarget.dataset.index];
    if (banner && banner.categoryId) this.switchCategory(banner.categoryId);
  },

  onKingkongTap(e) {
    const item = this.data.kingkong[e.currentTarget.dataset.index];
    if (item.filterKeyword) {
      wx.navigateTo({ url: `/pages/search/search?keyword=${item.filterKeyword}` });
    } else {
      this.switchCategory(item.id);
    }
  },

  onChipTap(e) {
    this.switchCategory(e.currentTarget.dataset.id);
  },

  switchCategory(id) {
    if (this.data.activeCategory === id) return;
    this.setData({ activeCategory: id }, () => this.reload());
  }
});
