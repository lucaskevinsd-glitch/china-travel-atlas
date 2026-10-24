# 行程规划编辑能力：最小可行设计（第三轮包 D，方案先行，不含实现）

现状盘点（以代码为准，2026-10-24）：

- 生成：`planner-service.planTrip(index, input)` 按主题/季节打分排序，贪心按 `suggestedDays.max` 分配天数，展开为逐日 `itinerary: [{date, destinationId, destinationName, activities(取目的地前 3 项)}]`，附 `startDate/days/people/budgetTier/totalDays`。
- 展示：`pages-planner.renderPlan` 只读 `<ol>`；表单提交后 `store.setPlanDraft({savedAt, from, plan})`，页面进入时恢复草案。
- 存储：`store` 单键 `cta.store.v1`（localStorage，schema 1），读损坏降级为空状态；`save()` 已 try/catch，失败时静默仅内存保留。
- 缺口：无顺序调整、无增删、无逐日活动编辑、无保存反馈、无空态引导（无草案时结果区空白）。

## 设计决策

1. **编辑对象是“日”**：itinerary 的每一条即一天。同一目的地连续多天 = 多条记录，编辑按天进行，不引入“停留段”概念。
2. **重排语义**：上移/下移交换两项的 `destinationId/destinationName/activities`，`date` 序列保持不变（第 N 天永远是第 N 天，只是换了去处）。总天数与起止日期不变，实现最简单且语义无歧义。
3. **增删语义**：新增 = 从目的地选择器（index 全量）选一地，插入到指定日期之后并成为新的一天，后续日期顺延 +1 天，总天数 +1；删除 = 删当日，后续日期顺延 −1 天。删至 0 天时进入空态。
4. **活动编辑 v1 不做**：activities 仍随目的地取前 3 项；换目的地即换活动。逐条活动勾选/自定义留二期（需另设计活动来源与校验）。
5. **版本标记**：编辑后草案加 `edited: true, editedAt`（ISO 时间）；旧草案（无该字段）视为未编辑，向后兼容，不迁移旧数据。
6. **不引入账号与后端**：仍为单条本地草案；多行程、分享、云同步均不在 v1 范围。

## 交互（pages-planner 渲染改动）

- 每行末尾按钮组：`↑上移 ↓下移 ＋后插一天 ✕删除`（触摸目标 ≥44px，沿用现有按钮样式；首日无上移、末日无下移，禁用态而非隐藏，避免布局跳动）。
- 新增行：行内 `<select>`（目的地）+ 确认按钮，放在每一行下方展开或统一放在列表末尾（二期再定，v1 推荐每行后插，避免用户先翻到底）。
- 保存反馈：每次编辑后立即 `setPlanDraft` 并在列表顶部显示 `已保存 HH:MM` 轻提示；注意 `store.save()` 现为静默失败——须让 `save()` 返回布尔值并由 `setPlanDraft` 透传，写入失败时提示 `保存失败，仅本次会话有效`（新增 `PLAN_SAVE_FAILED` 提示条），不得谎称已保存。
- 空态：无草案时结果区显示引导文案（“还没有行程草案，填写上方表单生成”），替代当前空白。
- 加载失败：沿用现有 `DATA_LOAD_FAILED`；生成失败沿用 `INVALID_INPUT / EMPTY_RESULT`，均不改动。

## 数据与函数（新增纯函数，便于单测）

- `moveDay(itinerary, index, dir)`：交换相邻两项的目的地三字段，返回新数组（不改原数组，不改日期）。
- `insertDay(itinerary, afterIndex, dest)`：插入新日并顺延后续日期（`addDays` 已有）。
- `removeDay(itinerary, index)`：删除并顺延后续日期；空数组时调用方进入空态。
- 三者均不依赖 DOM，可直接进 `planner-service` 或独立 `planner-edit` 模块（推荐后者，避免改动生成算法文件）。

## 测试设计

- 单测（新增 `tests/unit/planner-edit.test.mjs`，沿用现有 shim/模块模式）：上移/下移边界（首末日）、插入后日期顺延与总天数、删除后顺延、删空、编辑标记字段、旧草案兼容（无 edited 字段可正常渲染）。
- E2E（新增 `tests/e2e/planner-edit.mjs`，复用 state 夹具）：生成 3 天草案 → 上移第 2 天 → 刷新页面仍为编辑后顺序 → 删除 1 天 → 删空出现空态引导 → 全程无未捕获错误。
- 回归：现有冒烟（规划生成路径）、天气关闭、收藏、筛选恢复均不受影响（本设计不改生成与存储结构）。

## 成本与风险

- 工作量：约 150–250 行（渲染按钮组 + 3 个纯函数 + 单测/E2E），无新依赖、无后端、无数据迁移；唯一存储层改动是 `save()` 返回值透传。
- 风险点：日期顺延逻辑须覆盖跨月/年（复用 `addDays`，已有单测）；localStorage 不可用时（隐私模式）编辑仅内存保留，须以提示明示，不得静默丢失。
- 不做：多行程管理、逐日活动编辑、拖拽排序（触屏拖拽成本高，按钮方案先行）、行程分享导出。
