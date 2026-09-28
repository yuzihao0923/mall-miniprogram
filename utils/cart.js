/**
 * 购物车服务：storage 持久化 + tabBar 角标同步
 *
 * item 结构：{ id, title, price, originPrice, emoji, colors, ratio, num, selected, spec, shop }
 */
const STORAGE_KEY = 'mall_cart_items';

function readCart() {
  return wx.getStorageSync(STORAGE_KEY) || [];
}

function writeCart(items) {
  wx.setStorageSync(STORAGE_KEY, items);
  syncBadge(items);
}

/** 商品总数（角标显示） */
function totalCount(items) {
  return (items || readCart()).reduce((sum, it) => sum + it.num, 0);
}

/** 同步 tabBar 购物车角标；非 tabBar 页面调用失败时静默 */
function syncBadge(items) {
  const count = totalCount(items);
  if (typeof wx === 'undefined' || !wx.setTabBarBadge) return;
  if (count > 0) {
    wx.setTabBarBadge({ index: 2, text: count > 99 ? '99+' : String(count), fail: () => {} });
  } else {
    wx.removeTabBarBadge({ index: 2, fail: () => {} });
  }
}

/** 加入购物车（同商品同规格合并数量） */
function add(goods, num = 1, spec = '默认规格') {
  const items = readCart();
  const found = items.find((it) => it.id === goods.id && it.spec === spec);
  if (found) {
    found.num += num;
  } else {
    items.unshift({
      id: goods.id,
      title: goods.title,
      price: goods.price,
      originPrice: goods.originPrice,
      emoji: goods.emoji,
      colors: goods.colors,
      ratio: goods.ratio,
      shop: goods.shop,
      spec,
      num,
      selected: true
    });
  }
  writeCart(items);
  return totalCount(items);
}

function updateNum(id, spec, num) {
  const items = readCart();
  const found = items.find((it) => it.id === id && it.spec === spec);
  if (found) {
    found.num = Math.max(1, num);
    writeCart(items);
  }
  return items;
}

function remove(id, spec) {
  const items = readCart().filter((it) => !(it.id === id && it.spec === spec));
  writeCart(items);
  return items;
}

function removeSelected() {
  const items = readCart().filter((it) => !it.selected);
  writeCart(items);
  return items;
}

function setSelected(id, spec, selected) {
  const items = readCart();
  items.forEach((it) => {
    if (it.id === id && it.spec === spec) it.selected = !!selected;
  });
  writeCart(items);
  return items;
}

function setAllSelected(selected) {
  const items = readCart();
  items.forEach((it) => { it.selected = !!selected; });
  writeCart(items);
  return items;
}

function list() {
  return readCart();
}

/** 已勾选列表 & 合计 */
function selectedSummary() {
  const items = readCart().filter((it) => it.selected);
  const total = items.reduce((sum, it) => sum + it.price * it.num, 0);
  const allSelected = readCart().length > 0 && items.length === readCart().length;
  return {
    list: items,
    count: items.reduce((sum, it) => sum + it.num, 0),
    total: Math.round(total * 100) / 100,
    allSelected
  };
}

function clear() {
  writeCart([]);
}

module.exports = {
  list,
  add,
  updateNum,
  remove,
  removeSelected,
  setSelected,
  setAllSelected,
  clear,
  totalCount,
  selectedSummary,
  syncBadge
};
