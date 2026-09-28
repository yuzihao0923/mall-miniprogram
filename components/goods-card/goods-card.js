const { formatSales, splitPrice } = require('../../utils/format.js');

Component({
  properties: {
    goods: {
      type: Object,
      value: {},
      observer(val) {
        this.setData({
          salesText: formatSales(val.sales || 0),
          priceParts: splitPrice(val.price || 0),
          originPriceText: val.originPrice ? splitPrice(val.originPrice).integer : '',
          imgStyle: `height: ${Math.round(345 * (val.ratio || 1))}rpx; background: linear-gradient(135deg, ${(val.colors && val.colors[0]) || '#eee'}, ${(val.colors && val.colors[1]) || '#ddd'});`
        });
      }
    }
  },

  data: {
    salesText: '',
    priceParts: {},
    originPriceText: '',
    imgStyle: ''
  },

  methods: {
    onTap() {
      const { goods } = this.data;
      wx.navigateTo({ url: `/pages/detail/detail?id=${goods.id}` });
    }
  }
});
