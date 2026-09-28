/**
 * 轻量 .env 加载器（零依赖）：启动时把 server/.env 的 KEY=VALUE 写入 process.env
 * .env 不入库（见 .gitignore），仓库内提交 .env.example 模板
 */
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2];
    // 去掉行尾注释与包裹引号
    if (/^["'].*["']$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
