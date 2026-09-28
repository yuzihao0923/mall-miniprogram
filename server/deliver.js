/**
 * 发货钩子 —— 业务方实现真正的「发货」
 *
 * 平台按「道具直购」结算，发货动作由商家自己完成：
 * 会员时长 / 虚拟道具 / 服务权益的入账逻辑都写在这里。
 * 失败时抛错：推送方（notify）会记录 deliveryError，等待补偿，不会重复入账。
 */
module.exports = function deliver(order, logger = console) {
  const { openId, productId, quantity } = order;

  // TODO: 在这里实现你的业务发货，例如：
  //   - 写入用户资产表：给 openId 增加 productId × quantity
  //   - 调用你自己的游戏/会员服务入账接口
  // demo：仅记录发货日志
  logger.log(`[deliver] 已发货 openId=${openId} productId=${productId} x${quantity}`);
};
