/**
 * 签名与工具（对应接入指引 5.5 两套签名）
 *
 * - paySig    = HMAC-SHA256(key = AppKey,     data = uri + '&' + body)
 *               前端支付时 uri 固定为 requestVirtualPayment，body 为 signData 原文
 * - signature = HMAC-SHA256(key = sessionKey, data = signData 原文)
 * - 关键约束：签名的 body 必须与实际发送/透传的字节完全一致，
 *   因此 signData 一旦生成即保存原文，不做任何重新格式化。
 */
const crypto = require('crypto');

function hmacSha256Hex(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

/** 前端 wx.requestVirtualPayment 的 paySig */
function paySigForClient(appKey, signData) {
  return hmacSha256Hex(appKey, 'requestVirtualPayment&' + signData);
}

/** 服务端调用 /xpay/* 接口的 paySig（uri 含路径，body 为请求 JSON 原文） */
function paySigForApi(appKey, uri, body) {
  return hmacSha256Hex(appKey, uri + '&' + body);
}

/** 用户态签名（sessionKey 由 code2Session 获得） */
function signatureForUser(sessionKey, signData) {
  return hmacSha256Hex(sessionKey, signData);
}

/**
 * 商户订单号：
 * - 8~32 位，仅字母数字，不能以下划线开头（平台约束）
 * - 形如 T + yyyymmddHHMMSS + 8 位随机（4 字节，同秒批量生成也几乎不碰撞）
 */
function genOutTradeNo(now = new Date()) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const t = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `T${t}${rand}`;
}

/** 轻量 XML 标签取值（兼容 CDATA），找不到返回 null */
function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * 道具直购 signData 构建（字段与平台契约一致，生成后原文透传与保存）
 * goodsPrice：道具单价（分），必须与 MP 后台「道具管理」中道具定价一致
 */
function buildSignData({ offerId, env, productId, goodsPrice, outTradeNo, buyQuantity }) {
  return JSON.stringify({
    offerId: String(offerId),
    buyQuantity: Number(buyQuantity),
    env: Number(env),               // 0 正式 / 1 沙箱
    platform: 'android',            // 道具直购固定 android（iOS 由微信端自动路由）
    productId: String(productId),
    goodsPrice: Math.round(Number(goodsPrice)),
    outTradeNo: String(outTradeNo)
  });
}

module.exports = {
  hmacSha256Hex,
  paySigForClient,
  paySigForApi,
  signatureForUser,
  genOutTradeNo,
  extractTag,
  buildSignData
};
