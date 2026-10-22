# China Travel Atlas 开发报告（2026-10-22 第二轮：清单 / 图片授权 / 浏览器测试）

状态口径：已完成=工作做完；已验证=实际执行测试并取得结果；待核实=信息未最终确认；未执行=本轮没做。本轮未推送、未部署、未启用 Pages、未下载任何图片、未接入新付费服务或密钥。

## A. 开工前状态

- 分支 `main`；开工 HEAD `1b5fe078c98c4af20045050951cc1d501c5d38d0`；工作区干净（`git status --porcelain` 无输出）。
- 本地未推送提交 2 个：`a7121e8`、`1b5fe07`；远程 `origin/main` = `6c825458`（以开工实际命令核对，非凭摘要）。
- 其他项目 HEAD 与上轮一致：FoodAtlas `53ced40`、青简 `42fd4d1`、LobeChat `fcbc16a6`、dsh-free-model `e937077`；本轮未写入这些目录。
- 已通读仓库 AGENTS/文档：docs/data-standard.md、docs/weather-service-contract.md、docs/testing.md、上一轮 dev-report；schema 与校验器行为以代码实读为准（本轮据此修正了冒烟脚本中多处与真实实现不符的选择器，见 D）。

## B. 首批目的地清单（任务 A）

交付：`docs/first-batch-candidates.md`（清单与口径）+ `data/candidates/first-batch-30.json`（30 条 schema 形 draft 记录）。

- 构成：自然风光 9、历史文化 9、城市旅行 4、休闲度假 3、特色地貌/地域文化 5；覆盖 24 个省级行政区，单省最多 3 条（四川、云南）。
- 坐标核验（已验证，以复核更正后为准）：逐条经 OpenStreetMap Nominatim 检索取点（WGS-84）。复核更正的完整清单见下方更正记录；莫高窟、篁岭、漓江、兵马俑、青海湖等点位经换词重查取定（兴坪古镇点、博物馆点、二郎剑点）。
- 与既有 3 条草案比对（复核更正后）：丽江与草案相距约 0.2 km；西湖更正点（苏堤）与草案（湖东侧）相距约 1.7 km，同属湖区；张家界更正点（黄石寨/金鞭溪）与草案相距约 2.1 km，同景区不同点位，正式录入时定点。
- **更正记录（2026-10-22 13:2x，复核发现）**：本报告初版关于坐标的表述依据的是检索过程的中间输出，与最终落盘的 `first-batch-30.json` 不一致，属执行疏漏。逐条以落盘文件复核后发现：西湖坐标实际误配至台湾高雄同名地点（22.7272,120.3230）、张家界误配至天门山（29.0503,110.4786）、平遥落在古城外西南、九寨沟点位偏景区南段；另有喀纳斯（注记误写门户区，实际为湖面点）、丽江（距离注记有误）、熊猫基地（注记误写停车点，实际为正门地址点）3 条注记错误，恩施 district 与点位所在侧（恩施市）不一致。以上已全部更正并写入各记录 verificationNote，更正后校验器复跑 0 错误 0 警告；长白山天池湖面点的界湖口径单列待定（见 B 与 H）。初版中“纠正 3 次误配”“张家界 5.7 km/南门点位”等表述以本更正为准。
- 特殊口径：漓江（线状水系）取兴坪段代表点；喀纳斯坐标为湖面点；张掖丹霞跨两县、点位落肃南侧；长白山天池为界湖湖面点（口径待定）——均逐条写入 verificationNote。
- 数据缺口（待核实）：30 条的简介/特色/交通均为草案文字，待逐条对照景区/文旅官方来源复核；图片全部未定（见 C）；点位口径待定 2 项（长白山界湖、丹霞行政表述）。
- 校验（已验证）：在临时目录以候选文件替换样例运行现有校验器：30 条 0 错误 0 警告，退出码 0。校验器未做任何迁就式修改。候选暂存 `data/candidates/` 而未并入 `data/destinations/`，因为与样例存在同 ID 记录，直接并入会触发全局 ID 重复校验；转正式时逐条移入并删除对应旧记录。

## C. 图片授权方案（任务 B）

交付：`docs/image-licensing-plan.md` + `data/candidates/image-candidates.json`（18 张实查登记）。

- 来源评估（已查证）：Wikimedia Commons 定为一期唯一来源——全站只收自由许可，逐图许可/作者/文件页可由官方 API（imageinfo/extmetadata）机器读取；Openverse 官方明确声明不核验单图许可，只作发现工具；Pexels 为平台统一许可（无署名义务、可改编，禁未改原图转售与背书暗示等），列备选。搜索引擎/旅游站/社交平台/AI 图一律排除。
- 义务要点：CC BY 须署名+许可链接+注明修改；CC BY-SA 另加相同许可分发改编版；CC0/PD 无法律义务但本项目仍统一登记。
- Schema 兼容（结论：不变更）：现有六字段足够承载——license 填短名全称、credit 填“作者 / Wikimedia Commons（+修改说明）”、sourceUrl 填 Commons 文件页。
- 审核流程：检索 → 许可门槛（仅 CC0/PD/CC BY/CC BY-SA，NC/ND 或信息缺失直接淘汰）→ 人工目检内容 → 登记状态 → 本地化（全图 ≤1600w、缩略 640w、转 WebP；估算 30 条约 13 MB）→ 入库校验。
- 本轮实查计数：评估 18 张（张家界/西湖/丽江各 6）；通过许可门槛待目检 14 张；已排除 4 张（卫星遥感图 1、1930 年代历史照片 3——许可合规但非现状）；**已确认可入库 0 张**（目检与本地化未执行，本轮未下载图片）。

## D. 浏览器测试（任务 C）

环境（已建立）：本机存在 Chromium 152（`/opt/meta-chromium/chrome`），以 playwright-core 驱动（`tests/e2e/` 独立 package，不下载浏览器、不进站点构建）。测试脚本 `tests/e2e/smoke.mjs`，选择器逐一以 pages-*.js 实际实现核对（首版脚本多处选择器凭印象写错，已按代码改正后重跑，这也是首轮 30 项结果作废重测的原因）。

传输层限制（如实记录）：Chromium 152 对回环地址启用 Local Network Access 检查，直连 127.0.0.1/localhost 导航被 `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` 拦截。已实测无效的办法：`--disable-features=LocalNetworkAccessChecks` 等启动参数组合、CDP 权限授予 local-network-access、企业策略文件（LocalNetworkAccessAllowedForUrls 等，测后已删除）、host-resolver 映射假域名（可达但会走系统代理返回空响应）。最终方案：Playwright 请求拦截把 `http://cta.test:8124/**` 映射到夹具目录文件——**页面渲染、JS 执行、交互均为真实 Chromium；被替代的只有 HTTP 传输层**。真实 HTTP 另行验证：python http.server 托管仓库目录，27 个站点文件 curl 全部 200（退出码见 E）。

夹具：站点副本 `/tmp/cta-e2e-site`，含 1 条 published 测试记录（候选张家界数据+本地生成色块图，alt/credit 明确标注 fixture，不在仓库数据内），副本内 build-index 与 validate --check-index 通过；运行前删除其全图文件验证破图降级。

实际执行结果（已验证，`node smoke.mjs`）：首测 15/16，唯一失败为真实缺陷——详情页主图加载失败时显示破图图标、无降级。已修复（ui.js 新增 `CTA.imgErr` 占位替换、卡片图与详情主图加 onerror；资源版本 20261022b→20261022c 三处同步），复测 **16/16 通过，退出码 0**：
首页渲染与已发布卡片、省份 chip 跳转、关键词命中/无匹配、省份筛选空状态、详情标题、天气请求失败显示“天气暂不可用”且不崩溃、破图降级、详情收藏→收藏页可见、规划生成 3 天草案含目的地、移动端 375px 五个路由无横向溢出（scrollWidth=375）、全程无未捕获页面错误。

未执行：手机真机测试（无真机环境）；线上页面测试（未部署、无授权）；天气成功路径的浏览器内验证（冒烟中天气被统一拦截为失败，成功路径已由 Node 真实请求联调覆盖，浏览器内未测）。

## E. 自动化检查

| 命令 | 结果 | 退出码 |
|---|---|---|
| `node --check`（15 个 JS 文件） | ok=15, fail=0 | 0 |
| `node tools/validate-data.mjs` | 3 条，0 错误 0 警告 | 0 |
| `node tools/validate-data.mjs --check-index` | 索引一致 | 0 |
| 候选校验（临时目录，候选替换样例） | 30 条，0 错误 0 警告 | 0 |
| `node --test tests/unit/*.test.mjs` | 13/13 通过 | 0 |
| `node tests/e2e/smoke.mjs`（修复后） | 16/16 通过 | 0 |
| curl 全量（仓库 27 个站点文件，经本地 HTTP） | 全部 200 | 0 |
| Open-Meteo 真实请求（上轮已做，本轮未重复） | — | — |

## F. 文件修改

新增：
- `data/candidates/first-batch-30.json`（任务 A 候选数据，draft）
- `data/candidates/image-candidates.json`（任务 B 图片登记 18 条）
- `docs/first-batch-candidates.md`、`docs/image-licensing-plan.md`（任务 A/B 文档）
- `tests/e2e/smoke.mjs`、`tests/e2e/package.json`、`tests/e2e/package-lock.json`（浏览器冒烟；依赖 playwright-core，仅测试工具）
- 本报告 `docs/dev-report-2026-10-22-phase-next.md`

修改：
- `assets/js/ui.js`：新增 `CTA.imgErr` 破图降级并用于卡片图（冒烟发现的真实缺陷修复）
- `assets/js/pages-detail.js`：详情主图加 onerror 降级
- `index.html`、`sw.js`、`assets/js/config.js`：资源版本 20261022b → 20261022c
- `docs/testing.md`：新增真实浏览器冒烟章节（环境、限制、夹具、运行方式）

Schema 未调整（图片六字段经评估足够，见 C）；站点本身仍零依赖、零构建，新增依赖仅限测试目录。

## G. Git 状态

- 本轮新增本地提交（见仓库 log，含本报告）；远程 `origin/main` 仍为 `6c825458`，**确认未推送**（本轮无任何 push/部署/Pages 操作）。
- 工作区在本报告提交后应为干净；`tests/e2e/node_modules/` 已被 .gitignore 覆盖（原有规则），未入库。

## H. 下一步建议

P0（阻塞内容上线）：
1. 总设计师确认 30 条候选名单（尤其长白山天池界湖点位口径：湖面点附界湖说明，或改用北坡观景台点）——无依赖，可立即拍板。
2. 30 条简介/交通逐条对照官方来源复核并补全 source——依赖 P0-1 定稿。
3. 14 张待目检图片完成人工目检与本地化（≤1600w WebP + 640w 缩略）后逐条入库——依赖图片审核流程（已建立）。

P1：
4. 获推送授权后推送本地 3 个未推送提交（a7121e8、1b5fe07、本轮提交），并做线上冒烟复测（含真实 HTTP 传输层）。
5. 天气生产路线拍板（和风注册与密钥注入 Worker）后单独一轮联调——依赖用户注册与决策。

P2：
6. 浏览器内天气成功路径断言（拦截返回固定真实结构样本并标注为夹具）。
7. 候选扩至第二批（中西部与东北地区加密）与图片 Pexels 备选源启用评估。
