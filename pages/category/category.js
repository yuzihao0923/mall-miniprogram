const request = require('../../utils/request.js');
const mock = require('../../data/goods.js');

Page({
  data: {
    categories: [],
    activeCategory: 'digital',
    leftList: [],
    rightList: [],
    loading: true
  },

  onLoad() {
    const first = mock.categories[0].id;
    this.setData({ categories: mock.categories, activeCategory: first });
    this.loadGoods(first);
  },

  async loadGoods(categoryId) {
    this.setData({ loading: true });
    const res = await request.fetchGoods({ category: categoryId, page: 1 });
    const leftList = [];
    const rightList = [];
    res.list.forEach((goods, i) => {
      (i % 2 === 0 ? leftList : rightList).push(goods);
    });
    this.setData({ leftList, rightList, loading: false });
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.activeCategory) return;
    this.setData({ activeCategory: id });
    this.loadGoods(id);
  }
});
