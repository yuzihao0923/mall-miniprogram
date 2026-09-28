/**
 * 统一数据请求层
 *
 * 当前 mockEnabled = true，直接读本地 mock 并模拟网络延迟；
 * 接入后端时：关闭 mock（config/env.js 对应环境文件），
 * 页面代码无需改动，本文件内部切换为 wx.request 真实请求。
 */
const env = require('../config/env.js');
const mock = require('../data/goods.js');

const PAGE_SIZE = 10;
const LOOP_ROUNDS = 3; // mock 数据循环三轮后不再有更多

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** mock 数据分页（循环填充，模拟无限流） */
function paginate(list, page, pageSize) {
  const capacity = list.length * LOOP_ROUNDS;
  const start = (page - 1) * pageSize;
  const hasMore = start + pageSize < capacity;
  const result = [];
  for (let i = 0; i < pageSize && start + i < capacity; i++) {
    result.push(list[(start + i) % list.length]);
  }
  return { list: result, hasMore };
}

function filterGoods({ category = 'all', keyword = '' } = {}) {
  const kw = keyword.trim().toLowerCase();
  return mock.goodsList.filter((g) => {
    const catOk = category === 'all' || g.category === category;
    const kwOk = !kw || g.title.toLowerCase().includes(kw) || g.shop.toLowerCase().includes(kw);
    return catOk && kwOk;
  });
}

/** 首页 / 分类 / 搜索：商品列表 */
async function fetchGoods(params = {}) {
  const { category = 'all', keyword = '', page = 1, pageSize = PAGE_SIZE } = params;

  if (env.mockEnabled) {
    await delay(300);
    const filtered = filterGoods({ category, keyword });
    const { list, hasMore } = paginate(filtered, page, pageSize);
    return { list, page, hasMore, total: filtered.length };
  }

  // 真实接口（示例，域名来自环境配置）
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${env.baseUrl}/goods`,
      method: 'GET',
      data: { category, keyword, page, pageSize },
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}

/** 商品详情 */
async function fetchGoodsById(id) {
  if (env.mockEnabled) {
    await delay(200);
    return mock.goodsList.find((g) => g.id === Number(id)) || null;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${env.baseUrl}/goods/${id}`,
      method: 'GET',
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}

/** 首页 Banner */
async function fetchBanners() {
  if (env.mockEnabled) {
    await delay(100);
    return mock.banners;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${env.baseUrl}/banners`,
      method: 'GET',
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}

module.exports = {
  fetchGoods,
  fetchGoodsById,
  fetchBanners,
  PAGE_SIZE
};
