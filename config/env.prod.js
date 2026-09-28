/**
 * 生产环境配置
 * 正式发布使用：真实网关域名，关闭 mock 与调试
 */
module.exports = {
  envName: 'PROD',
  baseUrl: 'https://api.example.com',
  mockEnabled: true,
  version: '1.0.0',
  debug: false
};
