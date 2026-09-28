/**
 * UAT 环境配置
 * 测试联调专用：对接 UAT 网关，可放开 mock
 */
module.exports = {
  envName: 'UAT',
  baseUrl: 'https://uat-api.example.com',
  mockEnabled: true,
  version: '1.0.0-uat',
  debug: true
};
