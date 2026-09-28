/**
 * UAT 环境配置
 * 测试联调专用：对接 UAT 网关，可放开 mock
 */
module.exports = {
  envName: 'UAT',
  baseUrl: 'https://uat-api.example.com',
  mockEnabled: true,
  version: '1.0.0-uat',
  debug: true,
  /** 虚拟支付（个人主体 · 道具直购） */
  xpay: {
    offerId: '',                            // MP 后台「虚拟支付」页获取
    serverBase: 'http://127.0.0.1:3000',    // 支付服务端（联调期本地）
    minWechatVersion: '8.0.68'              // iOS 最低支持版本
  }
};
