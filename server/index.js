/**
 * 虚拟支付服务端（个人主体 · 道具直购）—— Node 内置模块，零 npm 依赖
 *
 * 接口：
 *   GET  /pay/health          健康检查
 *   POST /pay/order           小程序下单 → 双签名 payData（wx.requestVirtualPayment 用）
 *   POST /pay/notify          微信发货推送 → 验单、幂等、发货、应答 0
 *   POST /pay/query/:outTradeNo  主动查单（对齐 query_order）
 *
 * 兜底：每 5 分钟轮询 PENDING 订单调用 query_order 同步状态（防推送丢失）
 * 启动：node server/index.js
 */
const http = require('http');
const config = require('./config.js');
const sign = require('./sign.js');
const store = require('./store.js');
const notify = require('./notify.js');
const deliver = require('./deliver.js');
const wxapi = require('./wxapi.js');

const GOODS = require('../data/goods.js').goodsList;

const logger = {
  log: (...a) => console.log(new Date().toISOString(), ...a),
  warn: (...a) => console.warn(new Date().toISOString(), '[warn]', ...a),
  error: (...a) => console.error(new Date().toISOString(), '[error]', ...a)
};

/** 按 productId 取道具单价（分）。安全要点：价格以服务端为准，绝不信任前端传价 */
function priceOf(productId) {
  const goods = GOODS.find((g) => String(g.id) === String(productId));
  if (!goods) return null;
  return Math.round(goods.price * 100);
}

/* ===== 下单 ===== */

async function handlePayOrder(body) {
  let payload;
  try { payload = JSON.parse(body || '{}'); } catch (e) { payload = null; }
  const { code, productId, quantity } = payload || {};

  if (!code || !productId || !quantity || quantity < 1) {
    return { status: 400, data: { code: 1, message: '参数缺失：code / productId / quantity' } };
  }

  const goodsPrice = priceOf(productId);
  if (goodsPrice === null) {
    return { status: 400, data: { code: 1, message: `未知道具 productId=${productId}（需在 MP 后台道具管理与商品一一对应）` } };
  }

  // code 换 openid + sessionKey（用户态签名密钥）
  const session = await wxapi.code2Session(code);
  store.saveSession(session.openid, session.session_key);

  // 组单 + 双签名（signData 生成后原文透传，禁止重排/重格式化）
  const outTradeNo = sign.genOutTradeNo();
  const signData = sign.buildSignData({
    offerId: config.offerId,
    env: config.env,
    productId,
    goodsPrice,
    outTradeNo,
    buyQuantity: quantity
  });
  const payData = {
    signData,
    paySig: sign.paySigForClient(config.appKey, signData),
    signature: sign.signatureForUser(session.session_key, signData)
  };

  store.saveOrder({
    outTradeNo,
    openId: session.openid,
    productId,
    quantity,
    goodsPrice,
    totalFee: goodsPrice * quantity,
    env: config.env,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  });

  logger.log(`[order] 下单成功 outTradeNo=${outTradeNo} productId=${productId} x${quantity}`);
  return { status: 200, data: { code: 0, outTradeNo, payData } };
}

/* ===== 兜底查单：推送丢失时同步订单状态 ===== */

async function pollPendingOrders() {
  const stale = store.listOrdersByStatus('PENDING', config.pollIntervalMs);
  for (const order of stale) {
    try {
      const resp = await wxapi.queryOrder({ openid: order.openId, outTradeNo: order.outTradeNo });
      if (resp.errcode === 0 && resp.order && Number(resp.order.order_state) === 1) {
        const wxOrderId = resp.order.wx_order_id || '';
        // 与推送同路径处理，保证幂等
        notify.handleNotify(
          `<xml><OpenId>${order.openId}</OpenId><MchOrderNo>${order.outTradeNo}</MchOrderNo><WXOrderNo>${wxOrderId}</WXOrderNo></xml>`,
          { store, deliver, logger }
        );
        logger.log(`[poll] 订单 ${order.outTradeNo} 已支付，发货完成`);
      }
    } catch (e) {
      logger.warn(`[poll] 查单失败 ${order.outTradeNo}: ${e.message}`);
    }
  }
}

/* ===== HTTP 服务 ===== */

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (d) => {
      buf += d;
      if (buf.length > 1e6) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  try {
    if (req.method === 'GET' && (url === '/pay/health' || url === '/health')) {
      return json(res, 200, { ok: true, env: config.sandbox ? 'sandbox' : 'production', offerId: config.offerId || '(未配置)' });
    }

    if (req.method === 'POST' && url === '/pay/order') {
      const body = await readBody(req);
      const r = await handlePayOrder(body);
      return json(res, r.status, r.data);
    }

    if (req.method === 'POST' && url === '/pay/notify') {
      const body = await readBody(req);
      const r = notify.handleNotify(body, { store, deliver, logger });
      if (r.ok) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end(notify.ack()); // 按指引：处理成功返回 0
      }
      logger.warn(`[notify] 处理失败: ${r.error}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end(r.error || 'error'); // 非 0 → 微信按退避策略重试
    }

    if (req.method === 'POST' && url.startsWith('/pay/query/')) {
      const outTradeNo = decodeURIComponent(url.split('/').pop());
      const order = store.getOrder(outTradeNo);
      if (!order) return json(res, 404, { code: 1, message: '订单不存在' });
      const resp = await wxapi.queryOrder({ openid: order.openId, outTradeNo });
      return json(res, 200, { code: 0, query: resp });
    }

    json(res, 404, { code: 1, message: 'not found' });
  } catch (e) {
    logger.error(`[http] ${req.method} ${url}: ${e.message}`);
    json(res, 500, { code: 1, message: e.message });
  }
});

/* ===== 启动 ===== */

const configured = config.validate(logger);

server.listen(config.port, () => {
  logger.log(`支付服务端已启动: http://127.0.0.1:${config.port}`);
  logger.log(`环境: ${config.sandbox ? '沙箱(env=1)' : '正式(env=0)'} | offerId=${config.offerId || '未配置'}`);
  logger.log('MP 后台发货推送 URL 请配置为: https://<你的域名>/pay/notify');
  if (!configured) logger.warn('当前缺少密钥配置，/pay/order 与查单不可用（其余接口可正常响应）');
});

if (config.pollEnabled) {
  setInterval(() => {
    if (!config.appKey) return;
    pollPendingOrders().catch((e) => logger.error('[poll] 轮询异常:', e.message));
  }, config.pollIntervalMs);
  logger.log(`兜底查单定时器已开启: 每 ${Math.round(config.pollIntervalMs / 60000)} 分钟`);
}
