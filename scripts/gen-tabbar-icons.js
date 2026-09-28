/**
 * tabBar 图标生成脚本（零依赖：Node 内置 zlib 手写 PNG 编码）
 * 生成 81x81 的灰 / 橙两态图标到 assets/tabbar/
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 81;
const OUT_DIR = path.resolve(__dirname, '..', 'assets', 'tabbar');

const GRAY = [122, 126, 135, 255];
const ORANGE = [255, 80, 0, 255];

/* ===== PNG 编码 ===== */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  // 每行前置 filter byte 0
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    raw.set(pixels.subarray(y * SIZE * 4, (y + 1) * SIZE * 4), y * (SIZE * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ===== 简易光栅化 ===== */

function newCanvas() {
  return Buffer.alloc(SIZE * SIZE * 4, 0);
}

function setPixel(px, x, y, color) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = color[0];
  px[i + 1] = color[1];
  px[i + 2] = color[2];
  px[i + 3] = color[3];
}

function fillCircle(px, cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) setPixel(px, x, y, color);
    }
  }
}

/** 沿线段刷圆点（近似圆角描边） */
function strokeLine(px, x1, y1, x2, y2, brushR = 3.5, color = ORANGE) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2 + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(px, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, brushR, color);
  }
}

function fillRoundRect(px, x, y, w, h, r, color) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const dx = xx < x + r ? x + r - xx : xx > x + w - 1 - r ? xx - (x + w - 1 - r) : 0;
      const dy = yy < y + r ? y + r - yy : yy > y + h - 1 - r ? yy - (y + h - 1 - r) : 0;
      if (dx * dx + dy * dy <= r * r) setPixel(px, xx, yy, color);
    }
  }
}

/* ===== 四个图标 ===== */

const icons = {
  /** 首页：三角屋顶 + 方形房身 */
  home(px, color) {
    strokeLine(px, 12, 40, 40, 14, 3.5, color);
    strokeLine(px, 40, 14, 68, 40, 3.5, color);
    strokeLine(px, 20, 38, 20, 66, 3.5, color);
    strokeLine(px, 20, 66, 60, 66, 3.5, color);
    strokeLine(px, 60, 66, 60, 38, 3.5, color);
  },
  /** 分类：四宫格 */
  category(px, color) {
    fillRoundRect(px, 12, 12, 25, 25, 6, color);
    fillRoundRect(px, 44, 12, 25, 25, 6, color);
    fillRoundRect(px, 12, 44, 25, 25, 6, color);
    fillRoundRect(px, 44, 44, 25, 25, 6, color);
  },
  /** 购物车 */
  cart(px, color) {
    strokeLine(px, 10, 14, 20, 14, 3.5, color);
    strokeLine(px, 20, 14, 25, 26, 3, color);
    strokeLine(px, 25, 26, 66, 26, 3.5, color);
    strokeLine(px, 66, 26, 61, 52, 3.5, color);
    strokeLine(px, 61, 52, 28, 52, 3.5, color);
    strokeLine(px, 28, 52, 25, 26, 3, color);
    fillCircle(px, 32, 64, 6, color);
    fillCircle(px, 55, 64, 6, color);
  },
  /** 我的：头 + 肩部圆弧 */
  mine(px, color) {
    fillCircle(px, 40, 26, 13, color);
    // 大圆裁剪出肩部弧线
    for (let y = 48; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if ((x - 40) ** 2 + (y - 84) ** 2 <= 36 ** 2) setPixel(px, x, y, color);
      }
    }
  }
};

/* ===== 生成 ===== */

fs.mkdirSync(OUT_DIR, { recursive: true });
let count = 0;
for (const [name, draw] of Object.entries(icons)) {
  for (const [suffix, color] of [['', GRAY], ['-active', ORANGE]]) {
    const px = newCanvas();
    draw(px, color);
    fs.writeFileSync(path.join(OUT_DIR, `${name}${suffix}.png`), encodePNG(px));
    count++;
  }
}
console.log(`✔ 已生成 ${count} 个 tabBar 图标 -> assets/tabbar/`);
