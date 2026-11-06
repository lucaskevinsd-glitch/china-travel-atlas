# B 阶段发布前审计报告（2026-11-06）

> 性质：发布前审计。**只审计，不修改代码、不提交、不推送、不部署，不清理或覆盖任何本地修改。**
> 审计范围：B0–B5（含 B4.1 审核补充）全部本地修改，对照各阶段报告逐项核对。
> 审计时间：2026-11-06 16:25–17:05（Asia/Shanghai）。本地版本 `20261105f`，线上版本仍为 `20261103a`（A1）。

## 一、核心结论

**审计通过，可发布。** B1–B5 的全部功能均已真实接入页面并通过真实浏览器（Firefox）验收；Git 工作区内容完整、无缺失（审计时工作区存在未提交修改：17 个已跟踪修改文件与 32 个未跟踪文件，合计 49 个待提交文件；本报告写完后成为第 33 个未跟踪文件，最终复核共 17 个已跟踪修改、33 个未跟踪，合计 50 个；实时远程 main 与本地 HEAD 一致，均为 624b315；本地 origin/main 追踪引用曾因未 fetch 而过期，发布前已通过 fetch 同步）；版本号、SW 缓存、图片版权、资源路径全部一致；无未修复的阻塞问题。

三项说明（非阻塞）：

1. **线上站目前仍是 A1 旧版**——B1–B5 从未部署，用户在手机上看到旧首页是预期状态，不是功能缺失。发布后线上才会变化。
2. **planner-edit 测试在本轮审计中一度失败**，原因是审计者（我）把 8125 测试服务起在了 `tests/e2e/` 目录而非仓库根目录，导致页面 404、等不到 `#plan-form`。纠正服务根目录后重跑 **11/11 通过**。属审计环境错误，非产品缺陷。
3. **已知遗留（B1–B5 报告原有，未变）**：K80 真机未验证、读屏未验证、SW 线上升级未观测；M1 对 13 个偏远目的地为空、M3 对 8 个为空；无交通时间数据；旧 `_relatedFor` 保留未删；移动竖屏下亚丁湖面偏底；`news.json` 需人工持续更新。

## 二、Git 状态（审计时实测）

- 分支：`main`；HEAD：`624b315`（A1-Release 发布报告）；远程 `origin/main` 与本地 HEAD 一致（`624b315`），无领先/落后。
- 最近 5 笔提交：`624b315`、`a5ad195`、`f8a73a6`、`4d81bd9`、`a48ce36`（均为 A1）。
- 工作区：**17 个修改文件**（+896/−180 行），**32 个未跟踪文件**，合计 **49 个文件**待提交（不含本报告；含本报告则 50 个）。
- `git diff --check` 通过（无空白错误）；无杂散未跟踪文件、无临时测试文件残留。
- 其他项目未触碰（本轮审计只读了 CTA 仓库）。

## 三、B1–B5 功能接入核对（代码 + 真实浏览器双重验证）

| 阶段 | 报告声称 | 审计核实 |
|---|---|---|
| B1 首页轮播 | 5 张新图 + 信息层 + 12s 恢复 + 减动效停止 | `data/heroes.json` 5 条；`pages-home.js` 经 `loadHeroes()` 取图、缺失回退旧图；真实浏览器打开首页：**5 张 slide 全部加载**（naturalWidth > 0），每张含省份眉题 + 目的地名 + 卖点 +「探索目的地→」按钮，链接指向正确详情页；5 个圆点；1440/390 均零溢出、零控制台错误。截图已目视（见第五节） |
| B2 主题与发现页 | 「城市漫游」→「古镇古城」，historic 代表故宫、ancient-town 代表乌镇；发现页 band 改「精选聚光灯」 | `THEME_SHOW` 四卡：自然山水→黄山、历史人文→故宫、古镇古城→乌镇、休闲度假→鼓浪屿；`pages-discover.js` band 结构在位；b2 验收零 FAIL |
| B3 发现页灵感中心 | 双视图 M1–M7；`news.json` 5 条真实资讯，过期自动隐藏 | `pages-discover.js` M1–M7 全部渲染；真实浏览器打开发现页：7 个模块标题齐全，新闻 5 条，来源链接 2 条抽查均可达；**5 条新闻 sourceUrl 用 GET 全部复核 200**（其中 2 条 HEAD 被拒属方法拦截，非死链）；M1 今日精选 2026-11-05 为泰山（按年中第几天轮换） |
| B4 规划器地理检测 | 坐标进索引；Haversine 三级检测；重排建议须点「应用此顺序」 | `tools/build-index.mjs` 白名单加 `location`；`pages-planner.js` 接入 `analyzeItinerary` / `suggestOrder` / `applyOrder`；Node 复核：布达拉宫→成都→承德 **2939km，检出 warn + severe**；b4 验收 44 OK 零 FAIL |
| B4.1 生成器地理感知 | `orderByGeography` 分数分层 + 最近邻；`input.pinned`；pinned 预留修复 | `planner-service.js` 含 `orderByGeography` 调用与 `pinnedAfter` 预留逻辑；Node 复核：无筛选 3 天生成 [杭州西湖，杭州西湖，乌镇]，总 65km、零提示；B4.1 审核补充的西湖重复问题已在报告中结论为有意多日游（同一 ID、suggestedDays max=2），非缺陷；b4-1 验收 44 OK 零 FAIL |
| B5 关联推荐 | `recommendations.js` 三层推荐；详情页三层区；空层隐藏 | `recommendations.js` 已注册 `index.html` 与 `sw.js` CORE；`pages-detail.js` `#rec-section` 含 `[data-rec-nearby]` / `[data-rec-similar]` / `[data-rec-extended]`；真实浏览器打开西湖详情页：**M1=4、M2=4、M3=4**，首条理由「直线距离约 65 公里，同在浙江省」；`ui.js` `opts.note` 理由行在位；b5 验收 72/72、控制台错误 0 |

## 四、完整测试结果（本轮审计实跑）

| 测试 | 结果 |
|---|---|
| `node tools/validate-data.mjs --check-index` | 42 条，**0 错误**，42 警告（均为 verificationNote 的预期 WARN） |
| 单元测试 `node --test tests/unit/*.test.mjs` | **88/88 通过，0 失败** |
| `tests/e2e/cta22-accept.mjs` | **42 通过，0 失败** |
| `tests/e2e/b1-accept.mjs` | 退出码 0，**0 FAIL**，控制台错误 0 |
| `tests/e2e/b2-accept.mjs` | 退出码 0，**0 FAIL**，控制台错误 0 |
| `tests/e2e/b3-accept.mjs` | 退出码 0，**0 FAIL**，控制台错误 0 |
| `tests/e2e/b4-accept.mjs` | **44 OK，0 FAIL**，控制台错误 0 |
| `tests/e2e/b4-1-accept.mjs` | **44 OK，0 FAIL**，控制台错误 0 |
| `tests/e2e/b5-accept.mjs` | **72/72 通过，控制台错误 0** |
| `tests/e2e/related.mjs` | **7/7 通过** |
| `tests/e2e/planner-edit.mjs` | **11/11 通过**（首跑因审计者服务根目录错误失败，纠正后重跑通过） |

- 四视口：b1–b5 验收套件均覆盖 **1440 / 1280 / 390 / 360**；本轮审计另在 1440 与 390 上直接打开首页、发现页、详情页目视核验，零横向溢出。
- 浏览器：Playwright Firefox（本机 Chromium 因 Hatch WebGL 域名策略无法启动，沿用既定方案）。
- 语义级索引比对：HEAD 与工作区索引各 42 条、ID 集合一致，**除 `location` 外零字段差异**；42 条坐标全部合法 WGS-84（lat 3–54、lng 73–136）。

## 五、首页实际打开验证（本轮审计重点）

真实浏览器打开本地首页（8130 端口），两视口截图存 `~/workspace/cta_audit/shots/`：

- `audit-home-1440.png`：首张为稻城亚丁牛奶海全幅图，左下文字层「四川省 · 甘孜藏族自治州 / 稻城亚丁 / 雪山环抱的牛奶海」+「探索目的地 →」按钮，5 个圆点、暂停/上一张/下一张控件齐全。
- `audit-home-390.png`：同内容移动端单列，文字可读、控件可达、无溢出。已知遗留：竖屏下牛奶海湖面偏底（B1 报告已有）。
- 5 张 slide DOM 实测：稻城亚丁（yading-2400.webp）、洪崖洞（chongqing-2400.webp）、九寨沟（jiuzhaigou-2400.webp）、沙坡头（shapotou-2400.webp）、呼伦贝尔（hulunbuir-2400.webp），全部 `loaded=true`，链接均为对应 `#/dest/<id>`。
- `audit-detail-1440.png`：西湖详情页关联推荐区，M1 四卡（乌镇 65km、苏州拙政园 129km、外滩 170km、黄山 190km）距离以陶土色突出；M2「相似旅行体验」区在下。
- `audit-discover-390.png`：发现页移动端，筛选器 +「今日精选」稻城亚丁 band（含「换一个精选」）+「当季旅行」秋季模块。

## 六、图片版权、资源路径、版本号、SW 缓存

- **版权**：5 张轮播图全部来自 Wikimedia Commons，许可为 **CC0 × 1（稻城亚丁）**、**CC BY-SA 4.0 × 4**，`heroes.json` 每条均有 `credit`、`license`、`sourceUrl`；版权页已新增「首页轮播」分区（`pages-credits.js`，5 行）；无 AI 生成图冒充真实照片。
- **资源路径**：10 个 hero 文件（2400w + 1200w 各 5）全部存在；`heroes.json` 的 `src` / `srcset` 首档全部存在；`validate-data` 0 错误。
- **版本号**：`index.html`（19 处）、`sw.js`（VERSION 与 AV 各 1 处）、`config.js`（assetV 1 处）全部为 **`20261105f`**，四处一致。线上仍为 `20261103a`，发布后才会变为 `20261105f`。
- **SW 缓存**：CORE 清单 18 条，**全部文件存在、无缺失**；`index.html` 引用的全部本地 JS 均在 SW 缓存内；DATA 清单含 `heroes.json`、`news.json`；新模块 `planner-geo.js`、`recommendations.js` 已在 CORE 内。
- **其他 diff 范围**：`config.js` 仅改版本号；`build-index.mjs` 仅加 `location` 白名单；`data-service.js` 仅加 `loadHeroes` / `loadNews`；`meta.json` 仅 `dataVersion`/`updated` 2026-11-03 → 2026-11-05；`index.html` 除版本 bump 外仅加 2 个 script 标签（planner-geo、recommendations）。无意外改动。

## 七、发布清单（待提交、推送的文件）

> 以下 50 个文件（含本报告）全部处于本地未提交状态。提交结构、提交信息、推送方式（`cta_replay.py`）由产品负责人与总设计师决定；本轮审计不代行。

### 修改文件（17）

| 文件 | 变更摘要 |
|---|---|
| `assets/css/main.css` | B1–B5 样式（+121/−6） |
| `assets/js/config.js` | 版本 `20261103a` → `20261105f` |
| `assets/js/data-service.js` | 新增 `loadHeroes` / `loadNews` |
| `assets/js/pages-credits.js` | 版权页新增首页轮播分区 |
| `assets/js/pages-detail.js` | 详情页三层推荐区 |
| `assets/js/pages-discover.js` | B2 band + B3 灵感中心 M1–M7 |
| `assets/js/pages-home.js` | B1 轮播信息层 + B2 主题卡 |
| `assets/js/pages-planner.js` | B4 地理检测与重排面板 |
| `assets/js/services/planner-service.js` | B4.1 地理排序 + pinned 预留修复 |
| `assets/js/ui.js` | `destCard` 增加 `opts.note` 理由行 |
| `data/destinations-index.json` | 42 条加 `location`（WGS-84），其余字段零差异 |
| `data/meta.json` | `dataVersion`/`updated` → 2026-11-05 |
| `index.html` | 版本 bump + 注册 planner-geo / recommendations |
| `sw.js` | VERSION/AV → `20261105f`，CORE 加 2 个新模块 |
| `tests/e2e/cta22-accept.mjs` | 验收期望更新 |
| `tests/e2e/related.mjs` | 按三层推荐结构重写 |
| `tools/build-index.mjs` | 索引白名单加 `location` |

### 新增文件（33，含本报告）

| 文件 | 来源 |
|---|---|
| `assets/img/hero/yading-2400.webp`、`yading-1200.webp` | B1 稻城亚丁 |
| `assets/img/hero/chongqing-2400.webp`、`chongqing-1200.webp` | B1 洪崖洞 |
| `assets/img/hero/jiuzhaigou-2400.webp`、`jiuzhaigou-1200.webp` | B1 九寨沟 |
| `assets/img/hero/shapotou-2400.webp`、`shapotou-1200.webp` | B1 沙坡头 |
| `assets/img/hero/hulunbuir-2400.webp`、`hulunbuir-1200.webp` | B1 呼伦贝尔 |
| `assets/js/services/planner-geo.js` | B4（Haversine + 三级检测 + B4.1 地理排序） |
| `assets/js/services/recommendations.js` | B5（三层推荐引擎） |
| `data/heroes.json` | B1（5 条轮播数据，含版权） |
| `data/news.json` | B3（5 条资讯，含来源与过期时间） |
| `docs/phase-b0-product-experience-audit-2026-11-05.md` | B0 审计报告 |
| `docs/phase-b1-homepage-report-2026-11-05.md` | B1 报告 |
| `docs/phase-b2-theme-discover-report-2026-11-05.md` | B2 报告 |
| `docs/phase-b3-discover-inspiration-report-2026-11-05.md` | B3 报告 |
| `docs/phase-b4-planner-geography-report-2026-11-05.md` | B4 报告 |
| `docs/phase-b4-1-planner-generation-geo-report-2026-11-06.md` | B4.1 报告 |
| `docs/phase-b4-1-review-supplement-2026-11-06.md` | B4.1 审核补充 |
| `docs/phase-b5-destination-recommendation-report-2026-11-06.md` | B5 报告 |
| `docs/phase-b-release-audit-2026-11-06.md` | 本报告 |
| `tests/e2e/b1-accept.mjs`、`b2-accept.mjs`、`b3-accept.mjs`、`b4-accept.mjs`、`b4-1-accept.mjs`、`b5-accept.mjs` | B1–B5 验收套件 |
| `tests/unit/planner-geo.test.mjs`、`planner-generation-geo.test.mjs`、`planner-duplicate-review.test.mjs`、`recommendations.test.mjs` | B4/B4.1/B5 单元测试 |

### 发布前待确认（审计不代决）

1. ChatGPT 对 B0–B5 的最终审核意见（本轮审计前尚未收到最终批复）。
2. 提交结构：单笔发布提交，或按 B1–B5 分阶段提交。
3. 推送后验证：线上版本变为 `20261105f`、首页新轮播可见、SW 旧客户端升级。
4. 仍未执行（与 B1–B5 报告一致）：K80 真机验收、读屏走查、线上 SW 升级直接观测。

## 八、Git 状态（审计结束时）

- 分支 `main`，HEAD `624b315`，远程一致；**未提交、未推送、未部署**。
- 本轮审计未修改任何产品代码与数据，未删除、覆盖或清理任何本地修改；仅新增本报告与 `~/workspace/cta_audit/shots/` 下 4 张审计截图（均在仓库外）。
- 审计用本地服务（8130/8125）已关闭。
