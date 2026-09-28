/**
 * 虚拟支付前端封装（个人主体 · 道具直购 short_series_goods）
 *
 * 流程：wx.login 取 code → 支付服务端 /pay/order 生成双签名 payData
 *      → wx.requestVirtualPayment 拉起支付
 *
 * 注意：payData（signData/paySig/signature）必须由服务端生成，
 *       AppKey 与 sessionKey 都不能出现在前端。
 */
const env = require('../config/env.js');

const XPAY = env.xpay || {};

/** 版本比较：v1 > v2 返回 1，< 返回 -1，= 返回 0 */
function compareVersion(v1 = '', v2 = '') {
  const a = v1.split('.').map(Number);
  const b = v2.split('.').map(Number);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/** 环境检查：iOS 低版本微信不支持虚拟支付，需提示升级 */
function checkEnvironment() {
  let device = {};
  let base = {};
  try {
    device = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
    base = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
  } catch (e) { /* 旧基础库回退 */ }
  const system = device.system || '';
  const wechatVersion = base.version || '';
  const isIOS = /iOS/i.test(system);
  if (isIOS && wechatVersion && compareVersion(wechatVersion, XPAY.minWechatVersion || '8.0.68') < 0) {
    return { ok: false, message: `当前微信版本过低（${wechatVersion}），iOS 端虚拟支付需升级微信至 ${XPAY.minWechatVersion} 或以上` };
  }
  if (!XPAY.offerId) {
    return { ok: false, message: '虚拟支付未配置 offerId（MP 后台开通虚拟支付后获取）' };
  }
  return { ok: true };
}

/** 服务端 POST */
function post(path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: XPAY.serverBase + path,
      method: 'POST',
      data,
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 0) resolve(res.data);
        else reject(new Error((res.data && res.data.message) || `服务端错误(${res.statusCode})`));
      },
      fail: () => reject(new Error('无法连接支付服务端，请确认已启动 server/'))
    });
  });
}

/**
 * 发起道具直购支付
 * @param {Object} goods 商品（id 映射为 MP 后台创建的道具 productId）
 * @param {Number} quantity 购买数量
 * @param {Function} [onOrderCreated] 下单完成、拉起收银台前的回调
 * @returns {Promise<{outTradeNo: string}>}
 */
async function buy(goods, quantity = 1, onOrderCreated) {
  const check = checkEnvironment();
  if (!check.ok) throw new Error(check.message);

  // 1. 临时登录凭证（换取 sessionKey 用于用户态签名）
  const code = await new Promise((resolve, reject) => {
    wx.login({ success: (r) => resolve(r.code), fail: () => reject(new Error('wx.login 失败')) });
  });

  // 2. 服务端下单（生成 signData + paySig + signature）
  const order = await post('/pay/order', {
    code,
    productId: String(goods.id),   // 道具 productId：与 MP 后台「道具管理」中一致
    quantity
  });
  if (onOrderCreated) onOrderCreated(order);

  // 3. 拉起虚拟支付
  return new Promise((resolve, reject) => {
    wx.requestVirtualPayment({
      mode: 'short_series_goods',
      signData: order.payData.signData,
      paySig: order.payData.paySig,
      signature: order.payData.signature,
      success: () => resolve({ outTradeNo: order.outTradeNo }),
      fail: (res) => {
        const msg = res && res.errMsg ? res.errMsg : '';
        if (/cancel/i.test(msg)) reject(new Error('已取消支付'));
        else reject(new Error('支付未完成：' + msg));
      }
    });
  });
}

module.exports = { buy, checkEnvironment, compareVersion };
