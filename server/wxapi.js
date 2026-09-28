/**
 * 微信接口封装（服务端 → 微信）
 * - code2Session：code 换 openid + session_key（用户态签名密钥）
 * - stable_token：access_token 获取与缓存（到期前 5 分钟刷新）
 * - query_order ：道具直购查单（paySig 用 /xpay/query_order&body 签名）
 */
const https = require('https');
const config = require('./config.js');
const sign = require('./sign.js');

function httpsPost(host, path, bodyStr) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: host, path, method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } },
      (res) => {
        let buf = '';
        res.on('data', (d) => { buf += d; });
        res.on('end', () => resolve({ statusCode: res.statusCode, body: buf }));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('请求微信接口超时')));
    req.write(bodyStr);
    req.end();
  });
}

function parseJson(str) {
  try { return JSON.parse(str); } catch (e) { return null; }
}

/* ===== code2Session ===== */

async function code2Session(code) {
  const qs = `appid=${config.appId}&secret=${config.appSecret}` +
    `&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  const res = await httpsPost('api.weixin.qq.com', `/sns/jscode2session?${qs}`, '');
  const data = parseJson(res.body);
  if (!data || data.errcode || !data.openid) {
    throw new Error(`code2Session 失败: ${res.body.slice(0, 200)}`);
  }
  return data; // { openid, session_key, ... }
}

/* ===== access_token（stable_token，缓存） ===== */

let tokenCache = { token: '', expiresAt: 0 };

async function getAccessToken(force = false) {
  if (!force && tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const body = JSON.stringify({
    grant_type: 'client_credential',
    appid: config.appId,
    secret: config.appSecret
  });
  const res = await httpsPost('api.weixin.qq.com', '/cgi-bin/stable_token', body);
  const data = parseJson(res.body);
  if (!data || !data.access_token) {
    throw new Error(`stable_token 失败: ${res.body.slice(0, 200)}`);
  }
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 };
  return tokenCache.token;
}

/* ===== query_order ===== */

/**
 * 道具直购查单：优先 wx_order_id，其次 out_trade_no（二者必有其一）
 * 返回微信原始 JSON（order_state / wx_order_id 等）
 */
async function queryOrder({ openid, wxOrderId, outTradeNo }) {
  const payload = { openid, env: config.env };
  if (wxOrderId) payload.wx_order_id = wxOrderId;
  else if (outTradeNo) payload.out_trade_no = outTradeNo;
  else throw new Error('queryOrder 需要 wxOrderId 或 outTradeNo');

  const body = JSON.stringify(payload);
  const paySig = sign.paySigForApi(config.appKey, '/xpay/query_order', body);
  const token = await getAccessToken();
  const res = await httpsPost('api.weixin.qq.com',
    `/xpay/query_order?access_token=${token}&pay_sig=${paySig}`, body);
  const data = parseJson(res.body);
  if (!data) throw new Error(`query_order 响应异常: ${res.body.slice(0, 200)}`);
  return data;
}

module.exports = { code2Session, getAccessToken, queryOrder };
