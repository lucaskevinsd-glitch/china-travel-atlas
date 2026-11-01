# China Travel Atlas 2.2 正式开发报告（2026-11-01）

> 依据：ChatGPT 2.2 设计审核（有条件批准）——采用方案 A「沉浸风景」为主，吸收 B 的眉题排版、省份索引列表、编辑式信息层级。
> **本轮仅本地开发、测试与本地提交；未推送、未部署、未修改任何 draft/published 状态。**

## 一、改动摘要

- **S1 摄影版权**：新增 `#/credits` 路由与 `pages-credits.js`；93 张图片逐图展示作者、来源链接（可点击）、许可名称+官方许可链接；详情页画廊/灯箱的长署名条改为低干扰 `ⓘ 图片信息` 入口（深链 `#/credits?dest=<id>&img=<idx>`，定位并高亮对应图片）；发现页头图注移除；详情页天气区块整体移除；规格表"数据来源/最近核验"行移除；页脚重写（删除开发说明，保留导航/版权/摄影版权入口）。
- **S2 首页重构**：首屏 100vh 纯风景轮播（5 张真实 1600w 大图，零可见文字，仅图标控件）；轮播后粘性页内导航（全局顶栏在首页隐藏）；旅行主题改为不对称摄影网格（4 主题，卡片图取该主题首条结果封面，图文严格对应）；精选 1 大 + 2 卡（No. 眉题保留）；省份探索改为 B 式索引列表（24 省，数量实时计算）；首页搜索框移除（搜索保留在发现页关键词框）。
- **S3 页面统一**：kicker 眉题样式、B 式编辑层级用于详情眉题；发现/详情/规划沿用既有组件与数据结构，未重写架构。
- **S4 视觉修复**：V1（390px 轮播圆点左下/控件右下，实测间距 38px）；V2（省份改索引列表，实测 0 换行错位行）；V3/V4 不适用——终版未采用 B 的移动端主题均匀布局与纵向精选条目，详见 §六。
- **S5 内容治理**：苏州图 2、西江图 3 字节重复已替换（见 `docs/cta22-content-candidates-2026-11.md`）；12 条 draft 全字段核验通过，**全部保持 draft**，仅输出待审核发布候选清单。
- 资源版本：`20261028a` → `20261101a`（index.html 17 处、config.js assetV、sw.js VERSION/AV 四处一致）。

## 二、修改文件清单

| 文件 | 变更 |
|---|---|
| `index.html` | 新增 pages-credits.js 引用；页脚重写；版本 bump |
| `assets/js/pages-credits.js` | 新增：摄影版权页（深链定位+高亮） |
| `assets/js/pages-home.js` | 重写：轮播/主题/精选/省份索引/页内导航 |
| `assets/js/pages-detail.js` | 长署名条→ⓘ入口；删天气区块；删来源/核验行 |
| `assets/js/pages-discover.js` | 删头图注 |
| `assets/js/router.js` | 新增 credits 路由；首页隐藏顶栏的 body 类管理 |
| `assets/js/ui.js` | 新增 `CTA.ui.licenseUrl`（标准 CC deed 映射） |
| `assets/css/main.css` | 追加 2.2 样式（轮播/主题/精选/索引/版权页/移动端） |
| `assets/js/config.js`、`sw.js` | 版本 bump |
| `data/destinations/batch2-drafts.json` | 苏州图 2、西江图 3 元数据替换（状态仍 draft） |
| `data/candidates/image-candidates.json` | 追加 2 条 approved 登记 |
| `assets/img/full|suzhou-humble-garden-2.webp` 等 4 文件 | 重复图片原位覆盖 |
| `tests/e2e/cta22-accept.mjs` | 新增 2.2 验收测试（39 项） |
| `docs/cta22-content-candidates-2026-11.md` | 新增：候选清单与替换记录 |
| `docs/dev-report-2026-11-cta22.md` | 本报告 |

## 三、关键实现与设计决策

1. **首屏零文字**：轮播区 `innerText` 仅剩图标字形（‹ › ❚❚ 暂停/切换），有 `aria-label`；图片本身 `alt=""`（装饰性，链接有完整 aria-label）。
2. **主题卡跳转诚实性**：4 展示主题映射到真实数据主题（自然山水→nature、历史人文→historic、城市漫游→ancient-town（副文案"古城街巷，漫步时光"写明对应）、休闲度假→coastal）；卡片图 = 该主题索引首条封面，程序保证图文对应。未编造 type 筛选参数（发现页既有规则：不编造 type 参数）。
3. **非激活轮播 slide**：`pointer-events:none` + `tabindex=-1`，避免透明层拦截点击/键盘。
4. **版权深链**：`#/credits?dest=<id>&img=<idx>`，分区 `id="cd-<id>"`、图片行 `id="ci-<id>-<idx>"`，进入后滚动+高亮；无对应关系时不定位（不阻塞）。
5. **Public domain**：无官方 deed 页，版权页显示许可名称（无许可链接），来源链接仍可点击——已在验收测试中明确为例外。
6. **未动**：应用架构、数据结构、No. 编号规则、收藏/规划/搜索逻辑、PWA/SW 机制（仅版本 bump）。

## 四、数据和图片处理记录

- 苏州图 2 替换：`File:20090905 Suzhou Humble Administrator's Garden 4550.jpg`（Jakub Hałun，CC BY-SA 4.0，3008×2000，目检：拙政园月洞门亭阁；与保留图摄影师/年份不同）。
- 西江图 3 替换：`File:Xijiang Qianhu Miaozhai.Skyline.jpg`（Popolon，CC BY-SA 4.0，3264×1836，目检：千户苗寨吊脚楼群全景，与图 1 日景/图 2 夜景视角不同）。
- 处理：1600w full + 640w thumb WebP（q80），四文件可解码；替换后两条目内部去重 0 重复，与正式集交叉 0 重复。
- `validate-data.mjs --check-index`：42 条 0 错误（30 警告为 published 既有 verificationNote 留痕）。
- 93 图版权：见 `docs/copyright-93-verification-2026-11.md`；本轮再次确认前台不再有长署名条覆盖图片。

## 五、测试命令、结果和未执行项

| 测试 | 命令 | 结果 |
|---|---|---|
| 2.2 验收（新） | `node tests/e2e/cta22-accept.mjs`（真实 Firefox，http://127.0.0.1:8130） | **39/39 通过**（首页/轮播行为/减动效/390px/360px/768px/版权页93行/深链/详情ⓘ/灯箱/发现/规划/零控制台错误） |
| 单测 | `node --test tests/unit/*.test.mjs` | 39/39 通过 |
| 灯箱回归 | `node tests/e2e/lightbox-focus.mjs` | 16/16 通过 |
| 画廊回归 | `node tests/e2e/gallery.mjs` | 8/9（1 失败为既有环境问题：`/tmp/cta-state-site` fixture 已被系统清理，stash 验证改动前后相同，非回归） |
| 数据验证 | `node tools/validate-data.mjs --check-index` | 0 错误 |

**未执行**（明确声明，未用静态分析冒充）：
- K80 真机验收（设备此前 offline，清单见 p4-closeout §6）。
- 屏幕阅读器人工走查（键盘/焦点已自动化验证）。
- Service Worker 版本更新流程（VERSION 已 bump 至 cta-v1-20261101a；旧缓存清理逻辑未变，未实测更新）。
- 离线滚动懒加载图片（SW 离线 reload 已在 2.1 验证，本轮未重测）。
- `smoke.mjs` / `discover-state.mjs`：需 Chromium，本环境 Chromium 无法启动（Hatch WebGL domain policy），为既有环境限制。

## 六、已知问题及风险

1. **S4-V3/V4 不适用说明**：V3（B 移动端主题退化为均匀卡片）、V4（B 移动端精选过长）针对的是 B 方案的移动端布局；终版采用 A 的主题网格（移动端保留一大两小错落）与 1+2 精选卡片，不存在这两个布局，故无需单独修复。证据：`s4-hero-m.png`（390px 主题区）与验收截图。
2. 轮播第 2–5 张的横构图主体位置未逐张人工评审（截图只捕获第 1 张）；5 张均为正式集已目检过的横构图大图，风险低，列为实施后复核项。
3. 12 条 draft 的正式评审（简介二次确认、青岛口径）未执行，转 published 需另行授权。
4. 首页移除了搜索框与季节推荐入口，功能保留在发现页；导航习惯变化需在验收时确认。
5. `body.home-hero` 隐藏全局顶栏依赖路由每次渲染时移除该类；若未来新增不经过 router 的渲染路径需注意。

## 七、Git 基线与状态

- 开发前基线：HEAD `4667217`，工作区干净，远程 main `9aa1c97`（3 笔本地纯文档提交领先）。
- 本轮提交：`16b86e1`（S1+S2+S3 代码+版本 bump）；S4/S5/文档/测试待提交（见下方）。
- **未推送、未部署；与远程 main 的差异仅为本地提交；无用户未提交的修改混入**（暂存区检查通过）。
- 截图证据：`~/workspace/cta22_dev/shots/`（acc-*.png 验收 8 张 + s4-*.png 修复验证 2 张 + s2-*.png 过程 2 张）。

---
*本轮完成：S1–S5 全部执行完毕，测试 39/39；停止等待 ChatGPT 对正式开发成果的验收。*
