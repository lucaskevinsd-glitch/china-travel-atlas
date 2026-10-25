# China Travel Atlas 2.0 UX 第二阶段报告（2026-10-25）

目标：发现页筛选状态 URL 同步（可分享）与桌面端详情图片真实视觉验收。本轮不重复首页、行程编辑、相关推荐工作；仅本地开发与验证：未推送、未部署、未公开候选内容、12 条候选仍全部为 draft、呼伦贝尔坐标未动、天气保持关闭、无新增密钥。

## 0. 基线

- 分支 main，起始 HEAD `520ea6a`（上一轮 UX 升级结束点），工作区干净。
- 发现页实际筛选项经核查只有四项：关键词、省份、主题、适宜季节。任务书提到的“目的地类型”是数据模型字段，页面上没有对应的筛选控件，故 URL 参数不编造 type 参数；如需类型筛选属新增功能，不在本轮范围。

## 1. 筛选 URL 参数设计及实际行为

参数（全部挂在 `#/discover` 之后，与现有 Hash 路由兼容，不重写路由系统，不引入依赖）：

| 参数 | 取值 | 说明 |
|---|---|---|
| `keyword` | 任意字符串 | 关键词搜索；经 URL 编码，渲染时过 esc |
| `province` | 31 个省级区全名之一 | 不在列表内按空处理 |
| `theme` | 主题 id（如 `mountains`） | 不在主题列表内按空处理 |
| `season` | `spring` / `summer` / `autumn` / `winter` | 其他值按空处理 |

示例：`#/discover?province=湖南省&theme=mountains&season=autumn`。

优先级（明确处理冲突，不静默覆盖）：**前进/后退的历史状态 > URL 参数 > localStorage 保存状态**。理由：用户改动筛选后 localStorage 会被 persist 覆盖，若后退时仍以 localStorage 为准，后退将显示新状态而非上一状态；因此后退恢复必须以该历史条目自身的 `history.state` 为准。URL 参数整体优先于旧保存状态（不合并）：打开只有 `province` 的链接时，旧保存的 `season` 不会混进来。

同步规则：

- 离散改动（下拉切换、按“筛选”、清除筛选）用 `history.pushState`，产生可后退的历史条目；连续输入（关键词 200ms 去抖）用 `history.replaceState`，只更新当前条目，不刷屏历史记录。
- `pushState` / `replaceState` 均不触发 `hashchange`，不会引起路由重渲染循环；前进/后退触发 `hashchange` 时由现有路由重渲染发现页并从 `history.state` 或参数恢复。
- 无参数进入时，若 localStorage 有保存状态，首渲染后用 `replaceState` 把状态规范化进 URL，使复制当前链接即可分享筛选结果。
- 直接打开分享链接（URL 参数来源）时不恢复旧滚动位置；保存状态来源与历史状态来源下保留原有滚动恢复行为（发现页状态恢复测试场景 A/C 仍通过）。
- 非法参数在数据加载后清洗：省份、主题须在已知列表内，季节须为四季之一；非法值按空处理，并用 `replaceState` 把清洗后的状态写回 URL（不产生新历史条目）。
- 不写任何个人数据进 URL：仅四项筛选值；收藏、行程草案仍只存 localStorage。

关键实现（`assets/js/pages-discover.js`，路由与 store 均未动）：

- `pickFilters` / `buildQuery` / `syncUrl` 三个小函数；`syncUrl` 在 hash 已等于目标时仍 `replaceState`，确保 `history.state` 与筛选值一致。
- 初始化时读取 `history.state`（须含筛选键且值为字符串才采信）、URL 参数、localStorage 三路来源；数据加载后做合法性清洗。
- 下拉改动由“仅保存”改为“即时渲染 + 保存 + pushState”，与上一轮的关键词即时筛选一致，保证 URL 始终与结果集对应；“筛选”按钮与清除按钮同样同步 URL。

## 2. 真实照片裁切验收（桌面 520px 限高）

方法：直接以 `http.server` 服务真实仓库（非夹具色块），Firefox 真实浏览器截图。检查对象与结果：

| 目的地 | 类别 | 首图 | 1280px 桌面 | 390px 手机 | 放大层 |
|---|---|---|---|---|---|
| 黄山风景区（`huangshan`，3 图） | 山峰 | 奇松怪石峰林 | 主体（峰林、奇松、怪石）完整，天空与前景平衡，标题/简介/操作一屏内可见 | 8/5 比例下主体完整，操作可见 | 全图 contain 显示，上一张/下一张/关闭/署名/计数正常 |
| 青海湖（`qinghai-lake`，3 图） | 湖泊 | 湖畔“青海湖 海拔3196米”石刻 | 湖面、石刻文字、人物、草地全部完整，比例自然 | （同批截图，结构一致） | （画廊与放大逻辑与黄山同一实现，gallery 专项覆盖） |
| 故宫博物院（`forbidden-city`，3 图） | 古建筑 | 庑殿顶与汉白玉栏杆 | 屋顶、脊兽、栏杆完整，屋脊顶部未被切掉，首屏平衡 | 8/5 比例下屋顶与栏杆完整，操作可见 | — |

结论：**三类首图在 520px 限高下均未出现主体错误裁切，无需修复**。限高仅裁切图片上下非主体边缘（居中裁切），且放大层始终以 `contain` 显示全图，用户可随时查看完整照片。截图证据：`~/workspace/cta_evidence/ux/real-{huangshan,qinghai-lake,forbidden-city}-{1280,390}.png` 及 `-lb.png`（放大层）。

说明：本轮只验收了三条目的首图（画廊首张）；其余图片与三条目的第 2、3 张未逐张目视，见第 5 节。

## 3. 修改文件

- `assets/js/pages-discover.js`：URL 同步实现（见第 1 节）。
- `assets/js/config.js`、`index.html`、`sw.js`：版本号按规范同步递增 `20261024e` → `20261024f`。
- `tests/e2e/url-sync.mjs`：新增专项（13 断言，双浏览器）。
- 其余文件未动：路由、store、详情、规划、相关推荐、收藏均无改动；`data/meta.json` 本轮构建后无变化。

## 4. 测试结果（实际执行命令）

- `node tools/validate-data.mjs --check-index`：0 错误（42 条；30 警告为既有 published verificationNote 留痕）。
- `node tools/build-index.mjs`：30 条 published。
- `node --test tests/unit/*.test.mjs`：35/35。
- `tests/e2e/smoke-http.mjs`（Firefox）：16/16；`smoke.mjs`（Chromium）：16/16。
- `discover-state.mjs`：8/8 ×2（状态恢复兼容性未破坏，含返回后滚动恢复）。
- `gallery.mjs`：9/9 ×2；`related.mjs`：6/6 ×2；`weather-off.mjs`：6/6。
- `planner-edit.mjs`：11/11 ×2（含 390px scrollWidth=390，无横向溢出）。
- `ux-improve.mjs`：11/11 ×2。
- `url-sync.mjs`：**13/13 ×2**（直接打开、刷新、新标签分享、多参数、URL 优先于保存状态、非法参数清洗、输入同步 URL、前进、后退、清除筛选、无页面错误）。
- `sw-offline.mjs`：12/12（Firefox 真实断网；其版本参数化逻辑自动适配新版本号）。
- 专项测试中一次 Chromium 环境问题及处理：首版 url-sync 在 Chromium 下以 `127.0.0.1` 直连被本地网络访问检查拦截（`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`）；改为与 `discover-state.mjs` 相同的 `cta.test` 域名拦截做法后通过，属测试环境适配，非产品改动、无断言放宽。

## 5. 未解决问题及风险

1. K80 真机验收仍未执行（URL 分享链接在手机端 Edge 打开、复制粘贴行为需真机确认）。
2. 画廊第 2、3 张图片未逐张目视验收：三类首图通过，但个别图片若主体偏顶部/底部，居中裁切仍可能切到主体；建议转 published 前对 30 条目的全部 93 张图做一次桌面限高下的快速目视抽查，或在图片登记中标注主体位置。
3. 画廊横向滑动在真实照片下的手感已由 gallery 专项覆盖，但真机触控滑动仍待 K80 确认。
4. 下一轮候选：发现页筛选与 URL 已同步，首页主题/省份 chip 链接与之天然兼容，无需改动。

## 提交

- 本轮提交：`4018423`（筛选同步实现 + 测试）与本报告提交（见 git log 最新两条）。
- 历史未重写；工作区提交后干净。

**声明：本轮未推送、未部署、未公开候选目的地、未将任何 draft 改为 published、未修改呼伦贝尔坐标、天气保持关闭。**
