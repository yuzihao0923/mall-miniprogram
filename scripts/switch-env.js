/**
 * 环境切换脚本
 *
 * 用法：node scripts/switch-env.js <uat|prod>
 *   - 改写 config/env.js 的 ENV 标识
 *   - 将 project.config.<env>.json 复制为 project.config.json
 *     （appid / 项目名随环境切换，微信开发者工具中表现为两个独立项目）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, 'config', 'env.js');
const PROJECT_CONFIG_FILE = path.join(ROOT, 'project.config.json');

const target = process.argv[2];
if (target !== 'uat' && target !== 'prod') {
  console.error('用法: node scripts/switch-env.js <uat|prod>');
  process.exit(1);
}

// 1. 切换 config/env.js 的 ENV 标识
let envSource = fs.readFileSync(ENV_FILE, 'utf8');
const envPattern = /(const\s+ENV\s*=\s*')(\w+)(')/;
if (!envPattern.test(envSource)) {
  console.error('错误: 在 config/env.js 中未找到 ENV 声明');
  process.exit(1);
}
const prevEnv = envSource.match(envPattern)[2];
envSource = envSource.replace(envPattern, `$1${target}$3`);
fs.writeFileSync(ENV_FILE, envSource, 'utf8');

// 2. 同步 project.config.json
const sourceConfig = path.join(ROOT, `project.config.${target}.json`);
fs.copyFileSync(sourceConfig, PROJECT_CONFIG_FILE);

console.log(`✔ 环境已切换: ${prevEnv} -> ${target}`);
console.log(`  - config/env.js       ENV = '${target}'`);
console.log(`  - project.config.json <- project.config.${target}.json`);
console.log('  请在微信开发者工具中重新编译。');
