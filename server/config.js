/**
 * 服务端配置：一律从环境变量读取，禁止把真实密钥提交进仓库
 * 参照 server/.env.example 创建 server/.env（启动时自动加载）
 */
require('./load-env.js');

module.exports = {
  port: Number(process.env.PORT || 3000),

  // 小程序凭据（MP 后台「开发管理-开发设置」）
  appId: process.env.WX_APPID || '',
  appSecret: process.env.WX_APPSECRET || '',

  // 虚拟支付（MP 后台「虚拟支付」页）
  offerId: process.env.WPAY_OFFER_ID || '',
  appKey: process.env.WPAY_APPKEY || '',
  env: Number(process.env.WPAY_ENV === 'sandbox' ? 1 : 0), // 0 正式 / 1 沙箱
  sandbox: process.env.WPAY_ENV === 'sandbox',

  // 兜底查单定时器（建议每 5 分钟）
  pollEnabled: process.env.PAY_POLL_ENABLED !== 'false',
  pollIntervalMs: Number(process.env.PAY_POLL_INTERVAL_MS || 5 * 60 * 1000),

  // 订单数据目录
  dataDir: process.env.PAY_DATA_DIR || require('path').join(__dirname, 'storage')
};

/** 启动前校验必需配置 */
function validate(logger = console) {
  const missing = [];
  if (!this.appId) missing.push('WX_APPID');
  if (!this.appSecret) missing.push('WX_APPSECRET');
  if (!this.offerId) missing.push('WPAY_OFFER_ID');
  if (!this.appKey) missing.push('WPAY_APPKEY');
  if (missing.length) {
    logger.warn(`[config] 缺少环境变量: ${missing.join(', ')} — 支付接口将不可用（参照 server/.env.example 配置）`);
    return false;
  }
  return true;
}

module.exports.validate = validate;
