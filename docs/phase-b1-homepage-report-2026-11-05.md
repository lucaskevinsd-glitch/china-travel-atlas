# China Travel Atlas B1：首页沉浸式摄影体验改造 — 交付报告

**日期**：2026-11-05
**执行者**：MuseAI（执行工程师）｜总设计师：ChatGPT（待审核）
**基线**：Git `624b315`（=远程），线上 `cta-v1-20261103a`，42 条 published / 31 省
**边界**：本地开发、测试完成；**未提交、未推送、未部署**；未新增目的地、未修改正式目的地数据、未动其他页面业务功能。

---

## 一、实际修改文件

| 文件 | 变更 |
|---|---|
| `data/heroes.json` | **新增**：5 张轮播图配置（destId/双档 srcset/alt/版权/卖点/object-position） |
| `assets/img/hero/` | **新增**：10 个 WebP（5 张 × 2400w/1200w，16:9 预裁切） |
| `assets/js/pages-home.js` | 轮播改读 heroes.json（信息层+CTA）；控制逻辑重写（宽限重启/隐藏暂停/按钮解耦）；heroes 缺失时回退旧封面 |
| `assets/js/data-service.js` | 新增 `loadHeroes()`（带缓存，`?v=` 版本参数） |
| `assets/js/pages-credits.js` | 版权页新增「首页轮播」分区（5 张，作者/来源/许可 deed 链接） |
| `assets/css/main.css` | 新增 `.car-caption` 信息层、底部渐变遮罩、移动端适配、`text-wrap: balance` |
| `sw.js` / `index.html` / `assets/js/config.js` | 版本 `20261103a` → `20261105a`（四处一致） |
| `tests/e2e/b1-accept.mjs` | **新增**：B1 验收（四视口 × 10 项 + 减动效） |
| `tests/e2e/cta22-accept.mjs` | 更新 3 处期望（版权 129→134、「首屏零文字」→信息层断言、暂停按钮新语义） |

---

## 二、新旧首页设计差异

| 维度 | 旧（2.2/A1） | 新（B1） |
|---|---|---|
| 轮播图源 | 目的地封面图（1600w），硬编码 5 个 ID | `heroes.json` 独立选片（2400w/1200w WebP，16:9 预裁切） |
| 文字层 | **零**（B0 P0 问题） | 每张：省份眉题 + 目的地名 + 一句卖点 + 「探索目的地」CTA |
| CTA | 无（整图可点但无视觉提示） | 胶囊按钮，hover 箭头动效；整张 slide 仍为链接 |
| 自动切换 | 6s；手动操作后**永久停止**（移动端无法恢复） | 6s；手动/滑动后 **12s 宽限后自动恢复** |
| 页面隐藏 | 定时器继续跑（耗电） | `visibilitychange` 暂停/恢复 |
| 暂停按钮 | 与 hover 暂停竞态（移向按钮即触发 hover 暂停，点击反而恢复） | 只反映**显式**暂停状态，与 hover 解耦 |
| 减动效 | 仅禁用切换动画 | 保留：减动效下不自动播放（已验证） |
| 预加载 | 仅首图 preload | 首图 preload + `fetchpriority=high`；载入后预取第 2 张防闪白 |
| 版权 | 轮播图版权混在目的地相册中 | 版权页独立「首页轮播」分区，5 张逐条列出来源/作者/许可 |

---

## 三、最终图片清单（5 张）

| # | 目的地（ID） | 图片 | 卖点文案 |
|---|---|---|---|
| 1 | 稻城亚丁（daocheng-yading） | 牛奶海 | 雪山环抱的牛奶海 |
| 2 | 洪崖洞（hongya-cave） | 重庆夜景（千厮门大桥+洪崖洞） | 千厮门大桥与洪崖洞的璀璨夜景 |
| 3 | 九寨沟（jiuzhaigou） | 犀牛海秋色 | 秋色层林中的镜面犀牛海 |
| 4 | 沙坡头（shapotou） | 黄昏沙漠 | 黄昏下的金色沙丘 |
| 5 | 呼伦贝尔大草原（hulunbuir-grassland） | 莫尔格勒河 | 蜿蜒河曲穿过绿色草原 |

地貌覆盖：雪山湖泊 / 城市夜景 / 秋色彩林 / 沙漠 / 草原。排序逻辑：首张最强视觉冲击（牛奶海），随后昼夜/季节/地貌轮换。

**未采用的候选**（诚实记录）：
- 青岛栈桥 `Zhanqiao pier with Little Qingdao Isle.jpg`（4000×3000，CC BY-SA 4.0）：桥面多名游客虽非主体但属实瑕疵；5 张已满足多样性，不为凑海岸类别降低标准。留作 B2+ 备选。
- 巴丹吉林、蜈支洲岛（B0 推荐）：无对应已收录目的地ID，按「每张必须如实关联真实目的地」约束弃用。

---

## 四、图片原始分辨率及授权

| 图片 | 原图尺寸 | 许可 | 作者 | 来源 |
|---|---|---|---|---|
| `Yading National Park Milk Lake.jpg` | 5184×3888 | CC0 | Izeb | https://commons.wikimedia.org/wiki/File:Yading_National_Park_Milk_Lake.jpg |
| `Chongqing Skyline At Night.png` | 5712×3808 | CC BY-SA 4.0 | Maple Doctor | https://commons.wikimedia.org/wiki/File:Chongqing_Skyline_At_Night.png |
| `1 jiuzhaigou valley rhino lake 2011.jpg` | 4189×2768 | CC BY-SA 4.0 | chensiyuan | https://commons.wikimedia.org/wiki/File:1_jiuzhaigou_valley_rhino_lake_2011.jpg |
| `沙坡头景区之黄昏下的沙漠区 04.jpg` | 6000×4000 | CC BY-SA 4.0 | Liuxingy | https://commons.wikimedia.org/wiki/File:沙坡头景区之黄昏下的沙漠区_04.jpg |
| `陈巴尔虎旗 莫尔格勒河浩林温都日观景区 16.jpg` | 6000×4000 | CC BY-SA 4.0 | Liuxingy | https://commons.wikimedia.org/wiki/File:陈巴尔虎旗_莫尔格勒河浩林温都日观景区_16.jpg |

核实方式：Commons API（尺寸/许可/作者/描述/分类双重地点确认）+ 原图下载目视（非缩略图）。5 张本地文件：

| 文件 | 大小 |
|---|---|
| yading-2400.webp / yading-1200.webp | 358KB / 114KB |
| chongqing-2400.webp / chongqing-1200.webp | 452KB / 146KB |
| jiuzhaigou-2400.webp / jiuzhaigou-1200.webp | 295KB / 97KB |
| shapotou-2400.webp / shapotou-1200.webp | 76KB / 25KB |
| hulunbuir-2400.webp / hulunbuir-2400.webp | 185KB / 54KB |

合计约 1.8MB。16:9 预裁切策略：亚丁取底部（保湖）、沙坡头取底部（保沙丘去空天）、其余居中；`object-position` 微调移动端裁切重心。

---

## 五、图片加载和预加载策略

1. **首图**：`<link rel="preload" as="image" imagesrcset>` + `fetchpriority="high"`，不 lazy。
2. **第 2 张**：首页载入后 `new Image()` 预取，避免 6s 后自动切换时闪白。
3. **第 3–5 张**：`loading="lazy"`，进入视口/切换前由浏览器按需加载。
4. **srcset**：`1200w / 2400w` + `sizes="100vw"`，移动端自动取 1200w（约 25–146KB）。
5. **失败降级**：沿用 `CTA.imgErr(this,'hero')` 占位机制（已验证）。
6. **SW**：图片不进 SW（沿用既有约定）；版本递增至 `20261105a` 确保旧缓存不残留旧轮播代码。

---

## 六、桌面端截图

- `~/workspace/cta_b1/shots/b1-hero-1440.png`：首屏（稻城亚丁）— 信息层/CTA/圆点/控制组布局
- `~/workspace/cta_b1/shots/b1-hero-1280.png`：1280px 首屏
- `~/workspace/cta_b1/shots/b1-hero-1440-s5.png` / `b1-final-s5.png`：第 5 张（呼伦贝尔，标题换行优化前后）
- `~/workspace/cta_b1/shots/b1-final-credits.png`：版权页「首页轮播」分区

## 七、移动端截图

- `~/workspace/cta_b1/shots/b1-hero-390.png`：390px 首屏（信息层在标签栏上方，控制组可点）
- `~/workspace/cta_b1/shots/b1-hero-360.png`：360px 首屏
- `~/workspace/cta_b1/shots/b1-hero-390-s5.png` / `b1-hero-360-s5.png`：第 5 张

---

## 八、测试结果

### B1 验收（`tests/e2e/b1-accept.mjs`，Playwright Firefox，本地 8130）

| # | 项 | 1440 | 1280 | 390 | 360 |
|---|---|---|---|---|---|
| 1 | 首屏信息层（caption/标题/CTA） | ✅ | ✅ | ✅ | ✅ |
| 2 | 首图实际加载（naturalWidth>0） | ✅ | ✅ | ✅ | ✅ |
| 3 | 横向溢出 0px | ✅ | ✅ | ✅ | ✅ |
| 4 | 手动下一张 | ✅ | ✅ | ✅ | ✅ |
| 5 | 圆点跳第 5 张 | ✅ | ✅ | ✅ | ✅ |
| 6 | CTA 跳转目的地详情 | ✅ | ✅ | ✅ | ✅ |
| 7 | 暂停/恢复按钮语义 | ✅ | ✅ | ✅ | ✅ |
| 8 | 自动切换（6s） | ✅ | ✅ | ✅ | ✅ |
| 9 | 触屏滑动 | — | — | ✅ | ✅ |
| 10 | 版权页 heroes 分区（5 行） | ✅ | ✅ | ✅ | ✅ |
| + | 减动效下不自动播放 | ✅（1440 单独上下文） | | | |

控制台错误：**0**（四视口 + 减动效全程）。

### 回归（`tests/e2e/cta22-accept.mjs`）

**42/42 通过**（含 3 处 B1 适配更新：版权 129→134、信息层断言替代「零文字」、暂停按钮新语义）。

### 数据校验

`tools/validate-data.mjs --check-index`：0 错误，42 警告（均为既有 verificationNote 留痕模式，非阻塞）。

### 真实 Bug 修复记录

测试中发现并修复 **2 个真实问题**：
1. `data-service.js` 编辑时误删 `indexCache`/`shardCache` 声明 → 首页白屏 DATA_LOAD_FAILED。已恢复声明。
2. **hover 暂停与暂停按钮竞态**：鼠标移向暂停按钮时 hover 已先暂停，点击反而恢复自动播放。重构为按钮只反映显式 `userPaused` 状态，hover/focus/隐藏的临时停止不再改变按钮。

---

## 九、已知问题和剩余风险

1. **移动端竖屏裁切**：16:9 预裁切在 390×844 下取中央竖条，亚丁牛奶海的湖面在手机首屏不可见（山体仍震撼）。如需手机端保湖，需额外提供竖构图版本（`heroes.json` 已预留 `position` 字段，但无法改变 cover 裁切本质）。
2. **长标题换行**：「呼伦贝尔大草原（莫日格勒河）」在 1440 下两行显示，已用 `text-wrap: balance` 优化；超长地名仍是潜在排版风险。
3. **heroes.json 单点故障**：已做回退（缺失时用旧 CAROUSEL_IDS 封面，无信息层），但回退路径仅代码审查，未单独跑失败注入测试。
4. **未验证**：弱网/图片 404 的真实降级表现（`onerror` 占位逻辑沿用旧机制，代码未改）；旧客户端 SW 从 `20261103a` 升级到 `20261105a` 的线上行为（本地未模拟）；K80 真机手感。
5. **青岛海岸类别空缺**：5 张中无海岸类（有意为之，见第三章）；海岸线主题可在 B2 主题卡/发现页中补强。

---

## 十、下一阶段建议

1. **等 ChatGPT 审核本报告**，批准后再进入 B2（主题卡图文错配修复 + 发现页横幅）。
2. B2 可考虑：青岛栈桥图（备选已就绪）是否以「桥面游客属实景」口径采用，或继续征集零游客海岸图。
3. 移动端竖构图 hero（如总设计师认为必要）：为亚丁/九寨沟各备一张竖图，`<picture>` 按视口切换。
4. 发现页 B3 所需的 `news.json` 过期机制设计，可与 B2 并行准备。

---

**交付状态**：本地开发 + 测试完成，**未提交、未推送、未部署**，工作区变更清单见 `git status`。等待总设计师审核。
