import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const planner = require('../../assets/js/services/planner-service.js');
const geo = require('../../assets/js/services/planner-geo.js');

/* 真实索引数据（与产品同源）。 */
const index = JSON.parse(readFileSync(new URL('../../data/destinations-index.json', import.meta.url), 'utf8'));
const byId = {};
index.forEach(d => { byId[d.id] = d; });
const coordMap = {};
index.forEach(d => { coordMap[d.id] = geo.coordOf(d); });

test('1.同一目的地被重复输入：不崩溃，行程有效（日期连续、天数正确）', () => {
  const dup = [byId['west-lake-hangzhou'], byId['west-lake-hangzhou'], byId['wuzhen']];
  const plan = planner.planTrip(dup, { startDate: '2026-11-02', days: 3 }, geo);
  assert.equal(plan.ok, true);
  assert.equal(plan.totalDays, 3);
  assert.deepEqual(plan.itinerary.map(d => d.date), ['2026-11-02', '2026-11-03', '2026-11-04']);
  /* 真实索引 ID 唯一（validate-data 强制），重复输入只可能来自调用方误传；此处仅验证不崩溃、不产生非法行程 */
  const noGeo = planner.planTrip(dup, { startDate: '2026-11-02', days: 3 });
  assert.equal(noGeo.ok, true);
  assert.equal(noGeo.totalDays, 3);
});

test('2.同一目的地有意安排多日游：西湖 max=2，连占两天且 ID 相同、日期连续', () => {
  const plan = planner.planTrip(index, { startDate: '2026-11-02', days: 3 }, geo);
  assert.equal(plan.ok, true);
  /* ID 级断言（不是显示名）：前两天是同一个目的地 ID */
  assert.equal(plan.itinerary[0].destinationId, 'west-lake-hangzhou');
  assert.equal(plan.itinerary[1].destinationId, 'west-lake-hangzhou');
  assert.equal(plan.itinerary[0].date, '2026-11-02');
  assert.equal(plan.itinerary[1].date, '2026-11-03');
  assert.equal(plan.itinerary[2].destinationId, 'wuzhen');
  /* 依据：数据本身允许西湖住 2 天（suggestedDays.max=2），不是排序插入的重复 */
  assert.deepEqual(byId['west-lake-hangzhou'].suggestedDays, { min: 1, max: 2 });
  /* B4 检测：连住同一地点的腿为 0km，无提示 */
  assert.equal(geo.analyzeItinerary(plan.itinerary, coordMap).issues.length, 0);
});

test('2b.原有生成器（无 geo）本来就允许同一目的地跨日重复', () => {
  const p5 = planner.planTrip(index, { startDate: '2026-11-02', days: 5 });
  const ids5 = p5.itinerary.map(d => d.destinationId);
  assert.ok(ids5.filter(id => id === 'chengde-mountain-resort').length === 2, '5 天应有承德×2');
  const p7 = planner.planTrip(index, { startDate: '2026-11-02', days: 7 });
  const ids7 = p7.itinerary.map(d => d.destinationId);
  assert.ok(ids7.filter(id => id === 'chengde-mountain-resort').length === 2, '7 天应有承德×2');
  assert.ok(ids7.filter(id => id === 'dali-ancient-city').length === 2, '7 天应有大理×2');
});

test('3.多个不同目的地：5 天行程至少 3 个不同目的地', () => {
  const plan = planner.planTrip(index, { startDate: '2026-11-02', days: 5 }, geo);
  assert.equal(plan.ok, true);
  assert.ok(new Set(plan.itinerary.map(d => d.destinationId)).size >= 3,
    '不同目的地=' + [...new Set(plan.itinerary.map(d => d.destinationId))].join(','));
});

test('4.pinned 多目的地固定顺序：4 个 pinned 严格按给定顺序置前', () => {
  const pinned = ['yalong-bay', 'the-bund-shanghai', 'forbidden-city', 'shenyang-imperial-palace'];
  const plan = planner.planTrip(index, { startDate: '2026-11-02', days: 4, pinned }, geo);
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.itinerary.map(d => d.destinationId), pinned);
});

test('5.无坐标目的地：保留在对应层末尾（orderByGeography 级）', () => {
  const scored = [
    { d: byId['west-lake-hangzhou'], s: 0 },
    { d: { id: 'no-coord-place', name: '无坐标地', themes: [], bestSeasons: [] }, s: 0 },
    { d: byId['wuzhen'], s: 0 },
  ];
  const out = geo.orderByGeography(scored);
  assert.equal(out.length, 3);
  assert.equal(out[2].d.id, 'no-coord-place', '无坐标者应在层末');
  assert.deepEqual(out.map(x => x.d.id).sort(), ['no-coord-place', 'west-lake-hangzhou', 'wuzhen'].sort());
});

test('6.原 B4 案例 ID 级对照：同一固定输入，优化前后完整数据', () => {
  const input = { startDate: '2026-11-02', days: 3 };
  const before = planner.planTrip(index, input);
  const after = planner.planTrip(index, input, geo);
  /* 候选集合：同一输入，42 条 */
  assert.equal(index.length, 42);
  /* 最终 ID 顺序 */
  assert.deepEqual(before.itinerary.map(d => d.destinationId), ['potala-palace', 'chengdu-panda-base', 'chengde-mountain-resort']);
  assert.deepEqual(after.itinerary.map(d => d.destinationId), ['west-lake-hangzhou', 'west-lake-hangzhou', 'wuzhen']);
  /* 重复目的地数量（按 ID 计） */
  const dupCount = p => p.itinerary.length - new Set(p.itinerary.map(d => d.destinationId)).size;
  assert.equal(dupCount(before), 0);
  assert.equal(dupCount(after), 1, '优化后重复 1 个 ID（西湖连住两天），属有意多日游');
  /* 总直线距离 / 最大单腿 / B4 检测 */
  const a0 = geo.analyzeItinerary(before.itinerary, coordMap);
  const a1 = geo.analyzeItinerary(after.itinerary, coordMap);
  assert.equal(a0.totalKm, 2939);
  assert.equal(Math.round(Math.max(...a0.legs.filter(l => l.km != null).map(l => l.km))), 1683);
  assert.deepEqual(a0.issues.map(i => i.level), ['warn', 'severe']);
  assert.equal(a1.totalKm, 65);
  assert.equal(Math.round(Math.max(...a1.legs.filter(l => l.km != null).map(l => l.km))), 65);
  assert.equal(a1.issues.length, 0);
});

test('orderByGeography 不重复不增删：42 进 42 出，集合完全一致', () => {
  const ranked = index.slice().map(d => ({ d, s: 0 })).sort((a, b) => a.d.name.localeCompare(b.d.name, 'zh'));
  const ordered = geo.orderByGeography(ranked);
  assert.equal(ordered.length, 42);
  assert.equal(new Set(ordered.map(x => x.d.id)).size, 42);
  assert.deepEqual(ordered.map(x => x.d.id).sort(), ranked.map(x => x.d.id).sort());
});

test('打分与贪心分配未变：同一输入下分数多重集与分配规则一致', () => {
  /* 无筛选全为 0 分；有主题时分数只取决于主题/季节/省份，与地理排序无关 */
  const scores = index.map(d => planner.scoreDestination(d, { theme: 'nature', season: 'autumn', province: '' }));
  assert.ok(scores.every(s => s === 0 || s === 6 || s === 10 || s === 16));
  /* 贪心分配：西湖 max=2 时 3 天行程恰好占 2 天（分配逻辑未动） */
  const plan = planner.planTrip(index, { startDate: '2026-11-02', days: 3 }, geo);
  assert.equal(plan.itinerary.filter(d => d.destinationId === 'west-lake-hangzhou').length, 2);
});
