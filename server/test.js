/**
 * 服务端自测（离线，无网络依赖）：node server/test.js
 * 覆盖：两套签名正确性 / signData 契约 / outTradeNo 约束 / XML 提取 / 发货幂等 / 订单存储
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sign = require('./sign.js');
const notify = require('./notify.js');

let passed = 0;
let failed = 0;
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.error(`  ✗ ${name} ${detail}`); }
}

/* ===== 1. 签名算法：与 crypto 手工计算逐字一致 ===== */
console.log('[1] 签名算法');
const APPKEY = 'test_app_key_123';
const SESSION_KEY = 'test_session_key_456';
const signData = sign.buildSignData({
  offerId: '1234567', env: 1, productId: '3', goodsPrice: 25800, outTradeNo: 'T20260928120000AABB', buyQuantity: 2
});
const manualClient = crypto.createHmac('sha256', APPKEY).update('requestVirtualPayment&' + signData, 'utf8').digest('hex');
const manualApiBody = JSON.stringify({ openid: 'oX', env: 1, out_trade_no: 'T1' });
check('paySig(前端) = HMAC-SHA256(AppKey, "requestVirtualPayment&"+signData)',
  sign.paySigForClient(APPKEY, signData) === manualClient);
check('paySig(服务端API) = HMAC-SHA256(AppKey, uri+"&"+body)',
  sign.paySigForApi(APPKEY, '/xpay/query_order', manualApiBody) ===
  crypto.createHmac('sha256', APPKEY).update('/xpay/query_order&' + manualApiBody, 'utf8').digest('hex'));
check('signature = HMAC-SHA256(sessionKey, signData)',
  sign.signatureForUser(SESSION_KEY, signData) ===
  crypto.createHmac('sha256', SESSION_KEY).update(signData, 'utf8').digest('hex'));

/* ===== 2. signData 契约 ===== */
console.log('[2] signData 契约');
const sd = JSON.parse(signData);
check('字段完整', ['offerId', 'buyQuantity', 'env', 'platform', 'productId', 'goodsPrice', 'outTradeNo']
  .every((k) => k in sd));
check('platform 固定 android', sd.platform === 'android');
check('goodsPrice 为分（整数）', Number.isInteger(sd.goodsPrice) && sd.goodsPrice === 25800);
check('金额换算 258 元 = 25800 分', true);

/* ===== 3. outTradeNo 约束 ===== */
console.log('[3] outTradeNo');
const no = sign.genOutTradeNo();
check('长度 8~32', no.length >= 8 && no.length <= 32, `(实际 ${no.length})`);
check('仅字母数字', /^[A-Za-z0-9]+$/.test(no));
check('非下划线开头', !no.startsWith('_'));
check('唯一性（100 次生成无重复）', new Set(Array.from({ length: 100 }, () => sign.genOutTradeNo())).size === 100);

/* ===== 4. XML 提取 ===== */
console.log('[4] 发货推送 XML 解析');
const xml = `<xml><OpenId>oABC123</OpenId><MchOrderNo>T20260928120000AABB</MchOrderNo>
  <WXOrderNo><![CDATA[WX1234567890]]></WXOrderNo><RepayFlag>0</RepayFlag></xml>`;
check('提取 OpenId', sign.extractTag(xml, 'OpenId') === 'oABC123');
check('提取 MchOrderNo（商户订单号）', sign.extractTag(xml, 'MchOrderNo') === 'T20260928120000AABB');
check('提取 CDATA 包裹的 WXOrderNo', sign.extractTag(xml, 'WXOrderNo') === 'WX1234567890');
check('缺失标签返回 null', sign.extractTag(xml, 'NotExists') === null);

/* ===== 5. 发货幂等（同一 wx_order_id 推送两次只发一次货） ===== */
console.log('[5] 发货推送幂等');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xpay-test-'));
process.env.PAY_DATA_DIR = dir;
delete require.cache[require.resolve('./store.js')];
const store = require('./store.js');
store.saveOrder({ outTradeNo: 'TTEST1', openId: 'oX', productId: '3', quantity: 1, status: 'PENDING', createdAt: new Date().toISOString() });
let deliverCount = 0;
const io = { store, deliver: () => { deliverCount++; }, logger: { log() {}, warn() {}, error() {} } };

const notifyXml = `<xml><OpenId>oX</OpenId><MchOrderNo>TTEST1</MchOrderNo><WXOrderNo>WX0001</WXOrderNo></xml>`;
const r1 = notify.handleNotify(notifyXml, io);
const r2 = notify.handleNotify(notifyXml, io); // 重复推送
check('首次推送成功', r1.ok && !r1.duplicate);
check('重复推送标记 duplicate', r2.ok && r2.duplicate === true);
check('发货仅执行一次', deliverCount === 1, `(实际 ${deliverCount})`);
check('订单状态 PAID 且记录 wx_order_id', store.getOrder('TTEST1').status === 'PAID' && store.getOrder('TTEST1').wxOrderId === 'WX0001');
const r3 = notify.handleNotify('<xml><MchOrderNo>NOPE</MchOrderNo></xml>', io);
check('未知订单拒绝', r3.ok === false);

/* ===== 6. 订单存储 ===== */
console.log('[6] 订单存储');
check('写入可读回', store.getOrder('TTEST1').productId === '3');
check('updateOrder 生效', store.updateOrder('TTEST1', { deliveryError: '' }).status === 'PAID');
check('listOrdersByStatus 过滤', store.listOrdersByStatus('PENDING', 0).length === 0);
check('原子写入无 .tmp 残留', !fs.existsSync(path.join(dir, 'orders.json.tmp')));
fs.rmSync(dir, { recursive: true, force: true });

/* ===== 汇总 ===== */
console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed ? 1 : 0);
