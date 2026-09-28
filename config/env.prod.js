/**
 * 生产环境配置
 * 正式发布使用：真实网关域名，关闭 mock 与调试
 */
module.exports = {
  envName: 'PROD',
  baseUrl: 'https://api.example.com',
  mockEnabled: true,
  version: '1.0.0',
  debug: false,
  /** 虚拟支付（个人主体 · 道具直购） */
  xpay: {
    offerId: '',                            // MP 后台「虚拟支付」页获取
    serverBase: 'https://pay.example.com',  // 支付服务端（须为备案 HTTPS 域名）
    minWechatVersion: '8.0.68'              // iOS 最低支持版本
  }
};
