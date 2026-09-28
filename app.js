const env = require('./config/env.js');
const cart = require('./utils/cart.js');

App({
  onLaunch() {
    console.log(`[app] 启动环境: ${env.ENV}, baseUrl: ${env.baseUrl}, mock: ${env.mockEnabled}`);
    // 启动时同步一次购物车角标
    cart.syncBadge();
  },

  globalData: {}
});
