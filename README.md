# 好逛商城 — 微信小程序（原生）

淘宝式商城小程序，原生框架（WXML / WXSS / JS），零 npm 依赖，支持 **UAT / 生产** 环境隔离切换。

## 快速开始

1. 打开 **微信开发者工具** → 导入项目 → 选择本目录（`D:\Yuzihao0923\电商_微信小程序`）
2. AppID 选择「测试号」（当前 UAT 配置已内置游客模式 `touristappid`，直接点导入即可）
3. 编译运行，即可看到完整商城

> 当前为 mock 数据模式，无需后端即可体验全部页面。

## 功能一览

| 页面 | 功能 |
| --- | --- |
| 首页 | 搜索栏、轮播 Banner、金刚区分类、分类 chips、双列瀑布流、上拉加载、下拉刷新 |
| 分类 | 左侧一级分类 + 右侧商品双列列表 |
| 搜索 | 真实输入、历史记录（持久化）、热搜词、结果瀑布流 |
| 详情 | 图集轮播、价格/促销、服务保障、店铺、收藏、加入购物车、立即购买 |
| 购物车 | 勾选/全选、数量增减、删除、合计结算、tabBar 角标同步 |
| 我的 | 用户卡片、订单入口、常用工具（静态展示） |

## 生产 / UAT 环境隔离

环境隔离是**双保险**：Git 分支即环境，配置开关可微调。

### 分支模型（推荐用法）

| 分支 | 环境 | 配置状态（env.js / project.config.json） | 用途 |
| --- | --- | --- | --- |
| `main` | 生产 | `ENV='prod'` + 正式 appid 占位 | 上线代码，拉下来就是生产配置 |
| `uat` | 测试 | `ENV='uat'` + 游客 appid | 日常开发联调，拉下来就是 UAT 配置 |

```bash
git clone https://github.com/yuzihao0923/mall-miniprogram.git
cd mall-miniprogram
git checkout uat      # 开发联调（游客模式，导入开发者工具即用）
git checkout main     # 上线发布（替换正式 appid 后提审）
```

日常开发在 `uat` 分支进行，验证通过后合并回 `main` 发布；两分支除环境配置文件外代码完全一致。

### 配置开关（分支内微调）

```
npm run env:uat    # 切到 UAT（游客 appid + UAT 网关 + mock）
npm run env:prod   # 切到生产（正式 appid 占位 + 生产网关）
```

切换脚本（`scripts/switch-env.js`）做两件事：

| 变更文件 | 作用 |
| --- | --- |
| `config/env.js` 的 `ENV` 标识 | 决定运行时读 `env.uat.js` 还是 `env.prod.js`（baseUrl / mockEnabled / 版本号） |
| `project.config.json` ← `project.config.<env>.json` | 决定开发者工具里的 appid 和项目名，UAT 与生产是两个独立项目身份，互不污染 |

没有 Node 环境时手动切换：改 `config/env.js` 里 `const ENV = 'uat'` 一行即可（appid 在开发者工具「详情」里改）。

**上线前必做**：把 `project.config.prod.json` 的 `appid` 占位 `your_prod_appid` 替换为正式小程序 AppID，并在 `config/env.prod.js` 关闭 `mockEnabled`、填入真实网关域名。

## 目录结构

```
├── app.js / app.json / app.wxss     # 全局入口、页面注册、tabBar、全局样式
├── config/
│   ├── env.js                       # ★ 环境开关（唯一入口）
│   ├── env.uat.js / env.prod.js     # 各环境参数
├── data/goods.js                    # mock 商品 / 分类 / Banner 数据
├── utils/
│   ├── request.js                   # 统一数据层（mock ↔ 真实接口 无缝切换）
│   ├── cart.js                      # 购物车服务（storage 持久化 + 角标）
│   └── format.js                    # 价格 / 销量格式化
├── components/goods-card/           # 商品卡片（瀑布流 / 网格复用）
├── pages/{home,category,cart,mine,search,detail}/
├── assets/tabbar/                   # tabBar 图标（脚本生成）
├── scripts/
│   ├── switch-env.js                # 环境切换
│   └── gen-tabbar-icons.js          # 图标重新生成（node npm run icons）
├── project.config.uat.json / .prod.json   # 双环境项目配置源
└── project.config.json              # 当前生效配置（由脚本维护）
```

## 接入真实后端

1. `config/env.uat.js` / `env.prod.js` 填入真实 `baseUrl`，将 `mockEnabled` 改为 `false`
2. 在 `utils/request.js` 的真实请求分支中，按后端契约调整 URL 与字段映射
3. 页面代码无需改动

## 本期范围外（已留扩展位）

微信登录、支付、订单流程、真实图片资源（商品图当前为渐变色块 + emoji 占位，`image` 字段已预留）。
