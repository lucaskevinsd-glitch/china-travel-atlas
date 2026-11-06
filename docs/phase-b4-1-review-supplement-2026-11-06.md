# China Travel Atlas B4.1 审核补充：目的地重复与地理排序正确性核查

- 日期：2026-11-06
- 执行者：MuseAI；总设计师：ChatGPT
- 背景：ChatGPT 审核 B4.1 摘要后提出核查要求——优化后出现「杭州西湖 → 杭州西湖 → 乌镇」，需核实重复原因与算法正确性。
- 状态：本地完成，等待 ChatGPT 最终审核。**未提交、未推送、未部署。**

## 一、重复目的地问题结论

**结论：无重复插入缺陷。两个「杭州西湖」是同一个目的地 ID（`west-lake-hangzhou`）被有意安排为多日游，不是两个不同景点，也不是算法重复插入。**

核查证据（Node 可复现，脚本见 `/tmp/b41-verify.mjs`，单测见 `tests/unit/planner-duplicate-review.test.mjs`）：

| 核查项 | 方法 | 结果 |
|---|---|---|
| 两个西湖的 ID | 读取生成结果 `itinerary[].destinationId` | 均为 `west-lake-hangzhou`，日期 2026-11-02 与 2026-11-03（连续两天） |
| 是否不同景点同名 | 全索引按 `name` 检索 | 仅 1 条 `name=杭州西湖`（id 唯一）；无同名不同 ID 的景点 |
| `orderByGeography` 是否重复 | 42 条输入 → 输出集合逐项比对 | 输入 42 / 输出 42 / 唯一 42，集合完全一致，无重复、无增删 |
| `planTrip` 排序/分配/组装是否重复插入 | 同一输入分别跑有 geo / 无 geo，对比 ID 序列 | 有 geo：`[west-lake-hangzhou, west-lake-hangzhou, wuzhen]`；无 geo：`[potala-palace, chengdu-panda-base, chengde-mountain-resort]`。重复只出现在有 geo 一侧，但根源是分配阶段（见下），不是排序阶段 |
| 原有生成器是否本来就允许跨日重复 | 同一输入，无 geo，5 天 / 7 天 | 5 天：承德 ×2；7 天：承德 ×2、大理 ×2。**原有生成器本来就允许同一目的地跨日重复** |

**重复的根本原因**（在分配阶段，不在地理排序）：

- 杭州西湖的数据本身允许住 2 天：`suggestedDays: {min: 1, max: 2}`（承德 max=2、稻城亚丁 max=3、九寨沟 max=3，均为正式数据）。
- 贪心分配按 `min(建议天数上限, 剩余天数)` 给每个目的地分配天数。3 天行程中西湖排第一，`min(2, 3) = 2` 天，乌镇 1 天。
- 因此行程按天展开后出现两个相同 ID 的条目，是**一个目的地连住两天的正常展开**，与 B4.1 之前 5 天行程出现「承德 → 承德」完全相同。

**显示层面的说明**：详情页、行程页按天展示，每天一行，所以同一目的地多日游必然在界面上出现两次。这是产品既有呈现方式，不是 B4.1 引入的。

## 二、候选集合一致性结论

**结论：地理排序只改变顺序，不新增、不删除、不替换目的地；打分与贪心分配均未变。**

| 核查项 | 方法 | 结果 |
|---|---|---|
| 排序前后候选集合 | `orderByGeography` 输入/输出 ID 集合逐项比对 | 42 条输入 → 42 条输出，集合完全一致 |
| 原有目的地打分 | 同一输入下 `scoreDestination` 分数多重集 | 无筛选全为 0 分；有主题时分数只取决于主题/季节/省份，与地理排序无关 |
| 原有贪心分配 | 分配规则逐行比对（B4.1 报告后唯一改动见第四节） | 除第四节的 pinned 预留外，分配规则未变：按排名依次 `min(max, 剩余)`，至少 1 天，剩余并入最后一个 |
| pinned 保留 | 4 个 pinned（亚龙湾/外滩/故宫/沈阳），4 天 | **修复前**：亚龙湾占 3 天，故宫、沈阳未排入（见第四节）；**修复后**：4 个全部保留，各 1 天，顺序严格不变 |
| 无坐标目的地 | `orderByGeography` 级 + `planTrip` 级 | 保留在对应层末尾，相对顺序不变；行程中出现在最后一位，B4 仅给出 1 条 missing 信息提示 |
| 地理排序是否导致重复 | 42 条全量比对 + 重复输入专项 | 正常输入无重复；重复输入（同一 ID 传两次）不崩溃、行程有效（见第三节） |

## 三、算法前后对照数据

固定输入：`{startDate: '2026-11-02', days: 3}`，候选为全部 42 条索引目的地（无主题/季节/省份筛选）。可复现：`node /tmp/b41-verify.mjs`。

| 指标 | 优化前（无 geo） | 优化后（有 geo） |
|---|---|---|
| 候选目的地 ID 集合 | 42 条（全索引） | 42 条（全索引，完全一致） |
| 最终目的地 ID 顺序 | `potala-palace → chengdu-panda-base → chengde-mountain-resort` | `west-lake-hangzhou → west-lake-hangzhou → wuzhen` |
| 重复目的地数量（按 ID 计） | 0 | 1（西湖连住两天，属有意多日游） |
| 总直线距离 | 2939km | 65km |
| 最大单段直线距离 | 1683km（成都→承德） | 65km（西湖→乌镇；西湖→西湖为 0km） |
| B4 三级检测结果 | 1 警告（拉萨→成都 1256km）+ 1 严重（成都→承德 1683km） | 无 |

**「5 站仅 618km」与「杭州西湖 → 杭州西湖 → 乌镇 65km」口径说明**：两者属于不同测试案例，不可直接比较。

- **618km**：B4.1 设计阶段的分析数据。5 个**不同**目的地组成的最近邻链（乌镇 → 杭州西湖 → 苏州拙政园 → 外滩 → 黄山），用于论证"从最密集点出发的链路比从字母首位（布达拉宫）出发短"。实测复算：618km。
- **65km**：实际生成结果的总距离。3 天行程（西湖 2 天 + 乌镇 1 天），腿为 西湖→西湖 0km + 西湖→乌镇 65km，合计 65km。
- 差异原因：前者是 5 个不同目的地的链路分析，后者是 3 天行程（含 1 天连住）的总距离。口径不同，结论一致（地理连续性提升）。

## 四、是否修复及修复内容

**发现并修复 1 项缺陷（pinned 完整保留）**。重复问题本身无缺陷，不修改产品逻辑。

### 缺陷：pinned 目的地可能被贪心分配挤掉

- 现象：`pinned=[亚龙湾（max=3）, 外滩, 故宫, 沈阳]`，4 天。亚龙湾排第一，贪心分配给它 `min(3, 4) = 3` 天，剩余 1 天只够外滩，故宫、沈阳未排入。违反"pinned 完整保留用户指定的目的地和顺序"。
- 根源：`planTrip` 的贪心分配对 pinned 与非 pinned 一视同仁，未给后续 pinned 预留天数。
- 修复（`assets/js/services/planner-service.js`，仅分配循环）：为每个尚未分配的 pinned 目的地预留至少 1 天。

```js
for (let oi = 0; oi < ordered.length; oi++) {
  if (remaining <= 0) break;
  const item = ordered[oi];
  const pinnedAfter = oi < pinned.length ? pinned.length - 1 - oi : 0;
  const want = Math.max(1, Math.min(max, remaining - pinnedAfter));
  // ...
}
```

- 修复后验证（Node 实测）：
  - 4 天、4 个 pinned：全部保留，各 1 天，顺序不变。
  - 6 天、4 个 pinned：亚龙湾 3 天（拿满 max）、其余各 1 天，全部保留。
  - 3 天、4 个 pinned（天数不足以容纳全部）：保留前 3 个（亚龙湾、外滩、故宫），沈阳无法排入——天数不足时这是可行的最优结果（每个 pinned 至少需 1 天）。
- 边界安全：`want` 恒 ≤ `remaining`（`remaining - pinnedAfter ≤ remaining`，且 `Math.max(1, …)` 在 `remaining ≥ 1` 时不超过 `remaining`），总天数不会超过输入天数；非 pinned 段（`oi ≥ pinned.length` 时 `pinnedAfter = 0`）行为与修复前完全一致。

### 未修复（经核查确认无缺陷）

- 西湖重复：有意多日游，不删除、不改分配逻辑。
- B4 三级检测规则：未改。
- 原有目的地打分：未改。
- 贪心分配（非 pinned 段）：未改。

## 五、测试结果

### 专项核查（8 项，全部通过）

| # | 测试 | 方法 | 结果 |
|---|---|---|---|
| 1 | 同一目的地被重复输入 | 单测：候选含重复 ID `[西湖, 西湖, 乌镇]` | 不崩溃，行程有效（日期连续、总天数=3）。注：真实索引 ID 唯一（`validate-data` 强制），重复输入只可能来自调用方误传 |
| 2 | 同一目的地有意安排多日游 | 单测（ID 级断言）+ Node 复现 | 西湖 `max=2` 连占两天，ID 相同、日期连续，B4 零提示 |
| 3 | 多个不同目的地 | 单测：5 天行程 | 至少 3 个不同目的地 |
| 4 | pinned 多目的地固定顺序 | 单测 + Node 边界验证 | 4 个 pinned 严格按序置前；4 天全留、6 天亚龙湾拿满 max、3 天留前 3 个 |
| 5 | 无坐标目的地 | 单测（`orderByGeography` 级）+ `planTrip` 级 | 保留在层末，行程末位，仅 1 条 missing 提示 |
| 6 | 原 B4 布达拉宫 → 成都 → 承德案例 | 单测（ID 级对照） | 优化前/后数据见第三节，复现一致 |
| 7 | 原有 B4 地理检测回归 | e2e `b4-accept.mjs` 四视口 | 44 个 OK 断言，零 FAIL |
| 8 | 原有行程编辑和保存 | e2e `planner-edit.mjs` | 11/11，含保存（"✓ 已保存"）与删除 |

### 全部相关自动化测试

| 测试 | 结果 |
|---|---|
| 单测（5 个文件：planner / planner-edit / planner-geo / planner-generation-geo / **planner-duplicate-review（新增，9 项）**） | **46/46** |
| `validate-data.mjs --check-index` | 0 错误（42 警告为既有 verificationNote 留痕） |
| e2e `cta22-accept.mjs` | 42/42 |
| e2e `b4-accept.mjs` | 44 个 OK，零 FAIL |
| e2e `b4-1-accept.mjs` | 44 个 OK，零 FAIL |
| e2e `planner-edit.mjs` | 11/11 |
| e2e `b1-accept.mjs` / `b2-accept.mjs` / `b3-accept.mjs` | 零 FAIL |
| 控制台错误 | 四视口均为零 |

## 六、修改文件清单

| 文件 | 改动 |
|---|---|
| `assets/js/services/planner-service.js` | 贪心分配循环：为后续 pinned 各预留 1 天（`pinnedAfter`）。打分、地理排序、B4 检测均未动 |
| `tests/unit/planner-duplicate-review.test.mjs`（新建） | 9 项单测：重复输入、多日游（ID 级）、原生成器跨日重复、多个不同目的地、pinned 4 目的地、无坐标层末、B4 案例 ID 级对照、orderByGeography 集合一致、打分与分配未变 |

**未动**：`planner-geo.js`（`orderByGeography` 与 B4 检测规则）、目的地核心事实数据（西湖 `suggestedDays.max=2` 为正式数据，未改）、主题 ID 与筛选模型、其他页面、B1–B4 的已有修改、版本（仍为 `20261105e`，本轮无产品行为变更需要递增版本）。

## 七、Git 状态

- 分支：`main`；HEAD：`624b315`（A1-Release，未变）。
- 本轮新增/修改：`assets/js/services/planner-service.js`、`tests/unit/planner-duplicate-review.test.mjs`（新建）。B1–B4.1 修改完整保留。
- 本地测试服务（8130/8125）已关闭。

## 八、未提交、未推送、未部署

**本轮所有修改均为本地修改，未执行 `git commit`、未执行 `git push`、未部署 GitHub Pages。** 线上版本仍为 `cta-v1-20261103a`。完成后停止，等待 ChatGPT 最终审核。
