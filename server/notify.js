/**
 * 发货推送处理（微信 → 服务端 POST，5.4.1）
 * 核心约束：
 *  1. 以微信侧订单号 wx_order_id 做幂等去重，重复推送只发一次货
 *  2. 处理成功返回 0；异常返回非 0，微信会按退避策略重试
 *  3. 实际发货通过 deliver 钩子交给业务实现（可扩展会员/道具入账）
 */
const sign = require('./sign.js');

/**
 * @param {string} body 原始 XML 请求体
 * @param {Object} io   依赖注入 { store, deliver, logger }
 * @returns {{ok: boolean, duplicate?: boolean, order?: Object, error?: string}}
 */
function handleNotify(body, io) {
  const { store, deliver, logger = console } = io;

  const openId = sign.extractTag(body, 'OpenId');
  const mchOrderNo = sign.extractTag(body, 'MchOrderNo');
  const wxOrderId = sign.extractTag(body, 'WXOrderNo') || sign.extractTag(body, 'WxOrderId');

  if (!mchOrderNo) return { ok: false, error: '缺少 MchOrderNo' };

  const order = store.getOrder(mchOrderNo);
  if (!order) {
    logger.warn(`[notify] 未知订单: ${mchOrderNo}`);
    return { ok: false, error: '订单不存在' };
  }

  // 幂等：同一 wx_order_id 只处理一次
  if (order.status === 'PAID' && order.wxOrderId === wxOrderId) {
    return { ok: true, duplicate: true, order };
  }

  store.updateOrder(mchOrderNo, {
    status: 'PAID',
    wxOrderId: wxOrderId || '',
    openId: openId || order.openId,
    paidAt: new Date().toISOString()
  });

  try {
    deliver(
      { openId: openId || order.openId, productId: order.productId, quantity: order.quantity, order },
      logger
    );
    const paid = store.getOrder(mchOrderNo);
    return { ok: true, order: paid };
  } catch (e) {
    // 发货失败：保留 PAID 与 wx_order_id（幂等锚点），交由人工/任务补偿，避免重复入账
    logger.error(`[notify] 订单 ${mchOrderNo} 发货失败: ${e.message}`);
    store.updateOrder(mchOrderNo, { deliveryError: e.message });
    return { ok: false, order: store.getOrder(mchOrderNo), error: '发货失败' };
  }
}

/** 推送成功应答（指引约定：处理成功返回 0） */
function ack() {
  return '0';
}

module.exports = { handleNotify, ack };
