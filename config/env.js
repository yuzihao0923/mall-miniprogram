/**
 * 环境开关 —— 全局唯一需要修改的地方
 *
 * 切换方式（二选一）：
 *   1. 命令行：npm run env:uat / npm run env:prod
 *      （脚本会自动改写本文件的 ENV，并同步 project.config.json 的 appid / 项目名）
 *   2. 手动：把下面 ENV 的值改成 'uat' 或 'prod'
 *
 * 各环境参数见同目录 env.uat.js / env.prod.js
 */
const ENV = 'uat';

const configMap = {
  uat: require('./env.uat.js'),
  prod: require('./env.prod.js')
};

const config = configMap[ENV] || configMap.uat;

module.exports = {
  ENV,
  ...config
};
