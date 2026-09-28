const request = require('../../utils/request.js');
const mock = require('../../data/goods.js');

const HISTORY_KEY = 'mall_search_history';
const HISTORY_MAX = 10;

/** 与首页一致的瀑布流高度预估 */
function estimateHeight(goods) {
  const img = 345 * (goods.ratio || 1);
  const lines = Math.min(2, Math.ceil((goods.title || '').length / 11));
  const text = Math.max(2, lines) * 38 + 12 + 46 + 40 + 36;
  return img + text;
}

Page({
  data: {
    keyword: '',
    history: [],
    hotKeywords: [],
    searched: false,
    leftList: [],
    rightList: [],
    resultCount: 0,
    hasMore: true,
    loading: false
  },

  page: 1,
  colHeight: { left: 0, right: 0 },
  keyword: '',

  onLoad(options) {
    this.setData({
      history: wx.getStorageSync(HISTORY_KEY) || [],
      hotKeywords: mock.hotKeywords
    });
    if (options.keyword) {
      this.setData({ keyword: options.keyword });
      this.doSearch(options.keyword);
    }
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
    // 清空输入时回到历史/热搜视图
    if (!e.detail.value && this.data.searched) {
      this.resetResult();
    }
  },

  resetResult() {
    this.page = 1;
    this.colHeight = { left: 0, right: 0 };
    this.setData({ searched: false, leftList: [], rightList: [], hasMore: true });
  },

  onConfirm() {
    const kw = this.data.keyword.trim();
    if (kw) this.doSearch(kw);
  },

  onHotTap(e) {
    const kw = e.currentTarget.dataset.kw;
    this.setData({ keyword: kw });
    this.doSearch(kw);
  },

  onClearHistory() {
    wx.removeStorageSync(HISTORY_KEY);
    this.setData({ history: [] });
  },

  async doSearch(keyword) {
    this.keyword = keyword;
    this.page = 1;
    this.colHeight = { left: 0, right: 0 };
    this.setData({ searched: true, leftList: [], rightList: [], hasMore: true });
    this.saveHistory(keyword);
    await this.loadPage();
  },

  saveHistory(keyword) {
    let history = this.data.history.filter((k) => k !== keyword);
    history.unshift(keyword);
    history = history.slice(0, HISTORY_MAX);
    wx.setStorageSync(HISTORY_KEY, history);
    this.setData({ history });
  },

  async loadPage() {
    if (this.data.loading || !this.data.hasMore) return;
    this.setData({ loading: true });
    const res = await request.fetchGoods({ keyword: this.keyword, page: this.page });
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

    this.setData({
      leftList,
      rightList,
      resultCount: res.total,
      hasMore: res.hasMore,
      loading: false
    });
    this.page += 1;
  },

  onReachBottom() {
    if (this.data.searched) this.loadPage();
  }
});
