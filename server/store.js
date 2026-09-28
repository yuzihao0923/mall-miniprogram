/**
 * 订单与用户凭据存储：JSON 文件持久化（demo 用，生产建议换数据库）
 * 文件：storage/orders.json / storage/sessions.json
 */
const fs = require('fs');
const path = require('path');

function file(name) {
  return path.join(require('./config.js').dataDir, name);
}

function readJson(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(name, data) {
  fs.mkdirSync(path.dirname(file(name)), { recursive: true });
  const tmp = file(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file(name)); // 原子替换，防写坏
}

/* ===== 订单 ===== */

function saveOrder(order) {
  const all = readJson('orders.json', {});
  all[order.outTradeNo] = order;
  writeJson('orders.json', all);
  return order;
}

function getOrder(outTradeNo) {
  return readJson('orders.json', {})[outTradeNo] || null;
}

function updateOrder(outTradeNo, patch) {
  const all = readJson('orders.json', {});
  if (!all[outTradeNo]) return null;
  Object.assign(all[outTradeNo], patch, { updatedAt: new Date().toISOString() });
  writeJson('orders.json', all);
  return all[outTradeNo];
}

/** 指定状态且创建时间早于 staleMs 的订单（兜底查单用） */
function listOrdersByStatus(status, staleMs = 0) {
  const all = readJson('orders.json', {});
  const deadline = Date.now() - staleMs;
  return Object.values(all).filter((o) =>
    o.status === status && new Date(o.createdAt).getTime() <= deadline
  );
}

/* ===== sessionKey 缓存（openid -> sessionKey，供用户态签名） ===== */

function saveSession(openid, sessionKey) {
  const all = readJson('sessions.json', {});
  all[openid] = { sessionKey, updatedAt: new Date().toISOString() };
  writeJson('sessions.json', all);
}

function getSession(openid) {
  const rec = readJson('sessions.json', {})[openid];
  return rec ? rec.sessionKey : null;
}

module.exports = { saveOrder, getOrder, updateOrder, listOrdersByStatus, saveSession, getSession };
