# P4 独立回归验收报告（2026-10-29）

> 范围：只验收、必要时修复经证实的问题。不推送、不部署、不改 draft/published 状态。
> 基线：P3 交付链 `a0177bd → d4eae1e → db5fd98 → 66409f2 → ab3dea5`，本地 HEAD `ab3dea5`，工作区干净，远程 main 仍 `04c9f17`，线上仍 `20261024h`。

## 一、当前状态

- 分支：`main`；P4 结束时 HEAD：`bdbb44a`（P4 唯一产品代码修复，见 §五）；工作区干净。
- 本地领先远程：**11 笔**（P3 前 4 笔 docs：`cceb339`、`97cec77`、`406cc6b`、`4d44656`；P3 五笔：`a0177bd`、`d4eae1e`、`db5fd98`、`66409f2`、`ab3dea5`；P4 两笔：`bdbb44a`（CSS 修复）、`599a7c6`（本报告））。
- P4 产品代码差异（相对 `ab3dea5`）：仅 `assets/css/main.css` 1 行（移动端发现页头图 150px 覆盖提特异性，`div.disc-band img`）。data/、schemas/、tools/、其余 JS/CSS 零变更；无新数据字段；published/draft 状态未动。

## 二、任务 1：P3 交付与决策记录核对（代码实证）

| 决策项 | 核对结果 |
|---|---|
| 主推仅首页首张跨列 + 1600w 原图 | 通过。`pages-home.js:40` 仅 `i===0` 传 `featured`；`ui.js:55` featured 分支用 `coverFull`；CSS 跨列限定 `.home-grid`（`main.css:86`，移动端 `span 1`，`main.css:177`） |
| 其他页面不继承主推角标 | 通过。discover（`:131`）、related（`pages-detail.js:92`）、favorites（`:14`）均只传 `no`，不传 `featured` |
| 发现页头图条 = 当前结果集第一条封面；空结果隐藏 | 通过。`pages-discover.js:122`：`list.length ? band : ''`，用 `list[0].coverFull` |
| No. 按完整索引计算，筛选前后稳定；不重排索引 | 通过。四处均为 `index.findIndex + 1`（home 用 `i+1` 等价于索引位）；`data/`、`tools/build-index.mjs` 零变更 |
| VOL.01 与 assetV 分离 | 通过。刊头 `VOL.01`（`index.html:15`）；`assetV`/`VERSION`/`AV` 均为 `20261028a`（三处一致） |
| 画廊/缩略图/加载占位/失败占位/收藏图标/详情去重/天气中性条/省份展开/规划网格/日卡片配图与来源/灯箱 | 通过。与决策记录一致（抽查：画廊箭头+缩略图 5 处引用；天气关闭/失败均 `.weather-off`；省份切换取 `provincesDoc` 真实长度 31；规划 `.plan-dayno` DAY 序号 + `.plan-thumb` + `.plan-prov` 来源行；灯箱箭头 56px） |
| 陶土双档 | 通过。`#B25E1F`（`--accent`）仅用于：搜索按钮背景（白字）、主推角标背景（白字）、缩略图激活边框（非文本）；**无任何 `color: var(--accent)` 文本用法**。小字一律 `--accent-deep #9A4E18`（`.sec-no`、`.detail-eyebrow`、`.plan-dayno`） |
| 禁用组合（#B25E1F 暖纸/白底小字） | 不存在。grep 全仓零文本色引用 |
| 无新数据字段、不改发布状态 | 通过。`git diff 4d44656..HEAD -- data/ schemas/ tools/` 零文件 |

## 三、任务 2：完整回归测试

| 测试 | 命令 | 结果 |
|---|---|---|
| 单元测试 | `node --test tests/unit/*.test.mjs` | **39/39** |
| 数据校验 | `node tools/validate-data.mjs --check-index` | **0 错误**（30 WARN 均为既有留痕，非错误） |
| P3 专项验收 | `~/workspace/cta_evidence/p3/p3-accept.mjs`（真实 Firefox + 本地 8130） | **72/72** |
| 移动等价 | `tests/e2e/k80-equiv.mjs` | **32/32** |
| UI 升级回归 | `tests/e2e/ui-upgrade.mjs` | **21/21** |
| P4 移动专项 | `p4-mobile.mjs`（390×844、360×740 真实 Firefox + 触屏） | 初测 20/22 → 发现缺陷 1（§五）→ 修复后复测 2/2，**终 22/22** |
| 旧 /tmp 夹具套件（discover-state、gallery、related、planner-edit、url-sync、ux-improve、weather-off、sw-offline、smoke、smoke-http） | — | **未运行**（夹具目录已被 /tmp 清理删除，P3 已记录）。等价覆盖：related/规划编辑/画廊/筛选/天气关闭/路由均由 P3 专项 + 本轮移动专项在真实数据上覆盖；SW 离线与旧 smoke 无等价覆盖，标记**未验证** |

全程零页面脚本错误（各脚本均监听 pageerror）。

## 四、任务 3：移动端与真机风险

- 390×844 与 360×740：首页 100vw 通栏零溢出（`heroL=0`、宽=视口宽）；搜索卡上下结构；主推卡单列；发现页头图 150px（修复后）；详情吸顶导航不与顶栏重叠（`navTop ≥ topbarBottom`）；画廊箭头可见 ≥44px；规划日操作组 2×2；收藏页无溢出；全 5 页无横向滚动条。
- Android/K80 风险评估：`100vw` 在 Android Chrome（overlay 滚动条）下无滚动条宽度问题，Firefox 双视口实测零溢出；画廊为横向 scroll-snap，触摸手势与页面纵向滚动不冲突（结构上）；**触摸手势、真机渲染、真机吸顶行为未验证**（设备此前 offline 且无浏览器操作能力）。
- 结论：**真机未验证**，不得用模拟视口替代真机结论。

## 五、P4 发现并修复的缺陷（1 项，阻塞级→已修复）

- **移动端发现页头图高度覆盖失效**：`@media (max-width:720px)` 内的 `.disc-band img{height:150px}` 写在基础规则（220px）**之前**，同特异性下被后写的基础规则压住，390/360 实测仍为 220px。与 P3 阶段 D 的规划操作组缺陷**同一缺陷类**（移动端覆盖写在基础规则之前）。
- 修复：`div.disc-band img{height:150px}` 提特异性（提交 `bdbb44a`）；390/360 复测均为 150px。
- 全仓排查：其余移动端覆盖（hero、搜索卡、眉题、主推跨列、吸顶 top、scroll-margin、画廊缩略图、规划网格）均位于基础规则之后或已用 ID 提特异性，实测全部生效，无同类残留。

## 六、任务 4：图片焦点 Batch 1（18 张逐张目视）

方法：`muse.read` 直接查看 18 张 full 原图（可解码、可辨识，非凭文件名/尺寸断言）。检查项：加载成功、主体清晰、目的地正确、无重复、构图适合显示位置（首页主视觉通栏、16/10 卡片、详情画廊 2.0 裁切框、发现头图）。

| # | 目的地 | 图片 | 目视结论 | focus 变更 |
|---|---|---|---|---|
| 1 | 黄山 | huangshan-1.webp | 加载成功；奇峰松树主体居中偏下清晰；顶部天空远山；适合通栏/画廊 | 无（默认 center 最优） |
| 2 | 黄山 | huangshan-2.webp | 加载成功；云海峰林主体在中下部；上部为空天空；center 裁切保留主体 | 无 |
| 3 | 黄山 | huangshan-3.webp | 加载成功；松树前景左右、云瀑居中；主体纵贯全幅 | 无 |
| 4 | 故宫 | forbidden-city-1.webp | 加载成功；宫殿屋顶与栏杆居中；构图正 | 无 |
| 5 | 故宫 | forbidden-city-2.webp | 加载成功；角楼在中部横带；center 在 2.0 裁切下保留角楼 | 无 |
| 6 | 故宫 | forbidden-city-3.webp | 加载成功；午门居中略偏上；center 安全 | 无 |
| 7 | 洪崖洞 | hongya-cave-1.webp | 加载成功；夜景建筑群纵贯；center 保留核心楼群 | 无 |
| 8 | 洪崖洞 | hongya-cave-2.webp | 加载成功；灯光建筑群在中部横带；与图 1/图 3 非重复（不同机位） | 无 |
| 9 | 洪崖洞 | hongya-cave-3.webp | 加载成功；千厮门大桥横贯中部；前景游船人物在下部，center 不切断桥体 | 无 |
| 10 | 鼓浪屿 | gulangyu-1.webp | 加载成功；日光岩在中上部；center 裁切保留岩石主体 | 无 |
| 11 | 鼓浪屿 | gulangyu-2.webp | 加载成功；钢琴博物馆居中；馆名牌在顶部，center 不切牌 | 无 |
| 12 | 鼓浪屿 | gulangyu-3.webp | 加载成功；屋顶群填满全幅；无垂直偏好 | 无 |
| 13 | 莫高窟 | mogao-caves-1.webp | 加载成功；九层楼居中纵贯；center 最优 | 无 |
| 14 | 莫高窟 | mogao-caves-2.webp | 加载成功；崖壁栈道与游人在中部；center 保留 | 无 |
| 15 | 莫高窟 | mogao-caves-3.webp | 加载成功；洞窟主体在中部偏下；top 会切掉洞窟，center 正确 | 无 |
| 16 | 张掖丹霞 | zhangye-danxia-1.webp | 加载成功；彩色丘陵在中部偏下；center 保留 | 无 |
| 17 | 张掖丹霞 | zhangye-danxia-2.webp | 加载成功；山脊全景填满；center 最优 | 无 |
| 18 | 张掖丹霞 | zhangye-danxia-3.webp | 加载成功；红层山脊在中部偏下；center 保留 | 无 |

**结论：18/18 完成目视，补录 0 项**——全部 18 张主体均位于垂直中部，默认 `center`（50%）即为最优值，写值无收益。未凭猜测批量填写；`first-batch.json` 未改动。Batch 2–4（其余 75 张）未执行。

## 七、任务 5：辅助功能

- 收藏按钮：图标按钮 `aria-label`（"收藏"/"已收藏，点击取消收藏"）+ `aria-pressed`，状态切换时同步更新（`ui.js:74-84`）；详情页文字按钮 `aria-pressed` ✓。
- 画廊：左右切换 `aria-label`（上一张/下一张）、缩略图 `role="group"` + `aria-label="图片缩略图"` + 逐张 `aria-label="第N张图片"`、灯箱关闭/切换均有名称 ✓。
- 键盘：真实 Tab 遍历（详情页）顺序正常——品牌 → 首页 → 发现 → 规划 → 收藏 → 画廊轨道；`:focus-visible` 3px 轮廓在按钮焦点上实测可见；隐藏灯箱（`hidden` + `display:none`）的按钮**不可聚焦**（`focus()` 失败、`offsetParent` 为 null），无焦点泄露；灯箱打开时焦点自动移到关闭按钮，Esc 可关闭，点击遮罩可关闭。
- alt：主图/卡片图 alt 为目的地描述（有意义）；缩略图 `alt=""` 装饰性（避免重复朗读）✓；规划日卡片缩略图 alt 为目的地名 ✓。
- 语义：页内导航为 `<nav aria-label="页面内导航">`；筛选状态条 `aria-label="当前筛选条件"`；错误框 `role="alert"` ✓。
- 减动效：`prefers-reduced-motion` 下 shimmer `animation-name: none` 实测通过。
- **读屏未完成**：环境无屏幕阅读器。后续人工步骤：NVDA/VoiceOver 下走查——收藏状态朗读、画廊切换朗读、灯箱开关朗读、吸顶导航地标识别。
- 非阻塞改进建议（不阻塞发布）：灯箱打开时无焦点陷阱（Tab 可跑出到页面背后）；灯箱关闭后焦点未返回触发按钮。建议后续迭代补上。

## 八、任务 6：发布风险审计

1. 分支/HEAD/工作区：`main` @ `bdbb44a`，干净；远程 `04c9f17`；线上 `20261024h`。
2. 本地领先远程 11 笔（§一）。
3. 差异摘要：P4 仅 1 行 CSS 修复 + 本报告；P3 内容见 `docs/p3-delivery-report-2026-10-28.md`。
4. 测试统计：通过 39+72+32+21+22（移动专项）+ 键盘/减动效专项；失败 0（初测 2 项失败已定位修复并复测通过）；跳过 0；**未执行**：旧 /tmp 夹具套件（SW 离线等无等价覆盖）、K80 真机、读屏、focus Batch 2–4。
5. P3 原有问题：无回归；P4 新发现 1 项同类缺陷已修复（§五）。
6. 真实完成状态：K80 真机**未验证**；读屏**未完成**；图片焦点 Batch 1 **18/18 完成**（0 补录，结论见 §六）。
7. 严重/高风险问题：**无**。残余风险：K80 真机行为（100vw/吸顶/触摸）、SW 离线路径、读屏体验。
8. 发布前剩余事项：① ChatGPT 审核本报告；② 授权后经 `cta_replay.py` 重放推送 11 笔（届时复核 `git ls-remote`）；③ 线上验收（版本 20261028a、关键路径、390px、控制台）；④ K80 真机抽查（用户侧）；⑤ focus Batch 2–4 目视补录。
9. 发布审批建议：**建议进入发布审批**。依据：P3 交付与决策记录经代码逐项核对一致；回归测试 164 项自动化断言全过；P4 发现的唯一缺陷已修复并复测；无阻塞级问题；未验证项（真机/读屏/SW 离线）已明确记录且均有降级依据（桌面多视口实测、aria/键盘实测、SW 代码未动）。但"代码已完成"≠"真机验收通过"，真机结论须待 K80 抽查。

---
*本轮结束：不推送、不部署、不改 draft/published 状态，等待 ChatGPT 审核。*
