# China Travel Atlas 第六轮阶段报告：正式数据迁移、发现页状态恢复与天气降级（2026-10-22）

执行工程师报告。本轮按总设计师已定决策执行：首批 30 个目的地为第一版目标内容范围；发现页状态恢复列为产品整改；天气以诚实降级不阻塞第一版。**本轮未推送、未部署、未启用或修改 GitHub Pages**；远程 main 仍为 `6c825458`。

## A. 开工 Git 状态（实测）

- 分支 main，HEAD `530acbe`，工作区干净；本地未推送提交 7 个，全部保留；远程 `origin/main` = `6c825458`。
- 开工复读：上一轮报告、数据标准与 schema、候选与正式数据、审核表、路由与数据加载实现。加载机制确认：正式集 = `data/destinations/` 下非下划线 JSON 文件；build-index 只收 status=published；详情按 index 的 shard 分片加载。

## B. 正式数据迁移结果

迁移方式（最小改动、无结构重构）：候选记录与正式 schema 字段兼容（候选缺失的 adcode、seasonNotes 均为 schema 可选字段），整批迁入新文件 `data/destinations/first-batch.json`。

| 口径 | 结果 |
|---|---|
| 纳入正式数据集 | **30 条**（全部首批目的地） |
| 仍留在候选 | 0 条未迁移；`data/candidates/first-batch-30.json` 保留为核验来源档案（内容与正式集逐字段一致，交叉核对 0 差异） |
| 审核状态统计 | 已核实 23 / 已修正 7 / 初审通过 0（第六轮补核后，见 C 节） |
| 发布状态统计 | 正式集 30 条**全部 draft**，published = 0；未擅自置 published，网站正式发布状态与迁移前完全一致（build-index 输出 0 条、真实仓库形态浏览器检查正常、发现页为空状态文案） |
| source 字段 | 30 条已由早期的坐标检索来源更新为各条的事实核验主来源（名称+https 链接+2026-10-22 检索日期）；4 条原主来源为 http 站点，其中 2 条改用其 https 地址（china-npa.org、xjks.gov.cn，均实测打开），2 条改用已打开的 https 互证来源并在名称中注明 |
| 现有 3 条 draft | 张家界/西湖/丽江的样例记录已被迁移记录承接：字段超集核对通过（样例独有的 adcode、seasonNotes 已带入迁移记录），过时值（近似坐标、空图片、待核验说明）由已核实版本替代；样例原件逐字节归档于 `data/candidates/archive-examples-original.json`（SHA-256 与原文件一致），`_examples.json` 置为空数组，无数据丢失 |

一致性校验：正式集 ID 30 个全唯一；与候选的 summary/transportNotes/行政区划/坐标/图片引用逐项比对 0 差异；仓库校验器 30 条 0 错误 0 警告。三个概念严格分开：正式集成员资格（30 条已具备）、事实审核状态（见上）、对外发布状态（0 条 published，未变更）。

## C. 张掖与亚龙湾补核结果（均实际打开来源页面）

- **张掖丹霞 → 已核实**。张掖市人民政府官网七彩丹霞页已实际打开：景区位于临泽、肃南两县境内、丹霞地貌与彩色丘陵高度复合、7 处观景台，与简介逐项一致；district 保持肃南。证据等级注明：交通为泛述（张掖西站有景区旅游交通），甘肃省文旅厅页面多次抓取失败未打开正文，交通部分为多方一致来源支撑。
- **亚龙湾 → 已修正（轻微）**。度假区官网（syyalongbay.cn，官方站）已实际打开：1992 年国务院批准设立、2018 年获评国家级旅游度假区、7.5 公里海湾、吉阳区地址，与主体表述一致；亚龙湾站与吉阳区归属有清华大学机构页（已打开）支撑。原简介"海棠湾西侧"方位泛述无直接来源，已收窄为"三亚市吉阳区东部海岸"。
- 审核表第二部分与审计工具口径已同步更新（23/7/0），两条的 verificationNote 均已留痕。

## D. 发现页状态恢复（实现与测试）

实现（不重构路由，最小改动）：
- 状态载体：现有 `CTA.store`（localStorage）新增 discover 状态 {keyword, province, theme, season, scrollY}，带形状校验与局部合并保存；收藏/规划草稿不受影响。
- 恢复规则：进入发现页时，URL 参数（首页 chip 等显式入口）优先并覆盖保存值；无参数时恢复上次保存的筛选与滚动位置。筛选在提交/变更/输入时保存；滚动位置在滚动停稳 150ms 后保存；每次进入先清理上一轮滚动监听，不重复绑定。
- 定位过的真实问题：初版用 rAF 节流保存时，自动化点击卡片前浏览器将元素滚入视野的瞬时滚动会覆盖离开位置（实测保存值被写成 89 而非 500），改停稳保存后解决；此问题在真实触控下不出现，但修复使行为更稳健。

测试：store 单测 4 项（保存/合并/持久化/清洗/不影响收藏）；e2e 专项 discover-state.mjs 场景 A/B/C 共 8 项，Firefox 与 Chromium **各 8/8**（滚动精确恢复 500/400，结果集一致，首页往返不受影响，二次往返不累积错误）。

## E. 天气第一版降级策略（最终形态）

- 策略已写入 `docs/weather-service-contract.md`「第一版降级策略」：天气仅在详情页异步加载，主体先渲染；失败显示"天气暂不可用"，过期缓存显示警示，成功显示来源与更新时间；任何状态不伪造数据。总开关 `features.weatherEnabled` 可一键关闭天气（关闭时显示不可用）。
- 当前默认：Open-Meteo 联调通道（真实数据、已标注来源）。**生产服务未完成真实验证**：和风未接入、Worker 未部署、密钥未配置；若上线前站点性质/合规不允许 Open-Meteo，置 weatherEnabled=false 即完成降级，无需改代码。
- 新增测试：weather-off.mjs（天气关闭夹具）6/6 通过：详情标题/简介完整、明确显示不可用、收藏可操作、规划入口存在、无页面错误。既有天气降级单测（stale/无缓存抛错）与冒烟失败降级断言保留且通过。

## F. 回归测试结果（本轮实跑）

| 检查 | 结果 |
|---|---|
| `node --check` 全部 JS | 通过 |
| `node tools/validate-data.mjs` / `--check-index` | 30 条 0 错误 0 警告，退出码 0 |
| `node tools/audit-candidates.mjs` | 全部通过，退出码 0 |
| 单元测试 | **21/21**（原 17 + store 发现页状态 4） |
| Firefox 冒烟 smoke-http.mjs | 16/16 |
| Chromium 冒烟 smoke.mjs | 16/16 |
| 发现页状态专项（双浏览器） | 各 8/8 |
| 天气关闭专项 | 6/6 |
| 真实仓库形态（0 published 直接打开） | 首页/发现页正常渲染、空状态正确、0 页面错误 |

资源版本：index.html/config.js/sw.js 已统一升至 `20261022d`（本轮改了 store.js 与 pages-discover.js）。

## G. 未解决问题与风险

| 项 | 风险 | 说明 |
|---|---|---|
| published 时机与首批名单确认 | 发布阻塞（流程） | 30 条已具备正式集资格且全 draft；何时置 published 由总设计师决定，本轮未动 |
| 天气生产链路 | 高（若要求生产天气） | 和风接入需用户注册+Secret 注入+Worker 部署授权；或上线时关开关降级，二选一待拍板 |
| 手机真机验收 | 中 | 仍未执行（条件同前轮）；清单在第五轮报告 F 节 |
| 候选文件与正式文件双存 | 低 | 内容当前一致；后续修改应以正式集为准，候选文件仅作核验档案，避免双改漂移 |

## H. 变更文件与最终 Git 状态

- 数据：新增 `data/destinations/first-batch.json`（30 条 draft）、`data/candidates/archive-examples-original.json`（样例归档）；修改 `data/destinations/_examples.json`（置空）、`data/candidates/first-batch-30.json`（张掖/亚龙湾留痕与亚龙湾文本）、`docs/first-batch-audit.md`（两条状态与统计口径）。
- 代码：`assets/js/store.js`（discover 状态）、`assets/js/pages-discover.js`（恢复逻辑）、`assets/js/config.js`/`index.html`/`sw.js`（版本 20261022d）。
- 工具与测试：`tools/audit-candidates.mjs` 与其单测（口径 23/7/0）、新增 `tests/unit/store-discover.test.mjs`、`tests/e2e/discover-state.mjs`、`tests/e2e/weather-off.mjs`。
- 文档：`docs/weather-service-contract.md`（降级策略）、`docs/testing.md`（登记新专项）、本报告。
- 提交：本轮一个本地提交（见 git log）；本地未推送累计 8 个；远程仍 `6c825458`；其他项目未动。

## I. 发布边界声明

未执行 git push；未部署；未启用或修改 GitHub Pages；未修改线上环境；未购买服务；未写入任何密钥；30 条记录 published 状态未变更。

## J. 阶段结论与发布前剩余事项

结论：本阶段三项任务（迁移、状态恢复、天气降级）全部完成并通过回归，**阶段验收通过**（本地范围）。发布前仍需总设计师/用户完成的事项仅剩决策与授权类：① 决定 30 条置 published 的时机（或调整首批名单）；② 天气路线二选一（接入和风生产链路，或上线时关闭天气开关）；③ 部署后按清单完成 K80 真机验收；④ 正式发布（推送/Pages）授权。
