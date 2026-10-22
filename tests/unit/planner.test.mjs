import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const planner = require('../../assets/js/services/planner-service.js');

const CANDS = [
  { id: 'a', name: '安平地', themes: ['nature'], bestSeasons: ['autumn'], suggestedDays: { min: 1, max: 2 }, activities: ['徒步'] },
  { id: 'b', name: '乙地', themes: ['historic'], bestSeasons: ['spring'], suggestedDays: { min: 1, max: 1 }, activities: ['参观'] },
  { id: 'c', name: '丙地', themes: ['nature'], bestSeasons: ['autumn'], suggestedDays: { min: 2, max: 3 }, activities: ['摄影'] },
];

test('3 天行程：天数总和=3、日期逐日连续、主题匹配者优先', () => {
  const plan = planner.planTrip(CANDS, { startDate: '2026-11-01', days: 3, theme: 'nature', season: 'autumn' });
  assert.equal(plan.ok, true);
  assert.equal(plan.totalDays, 3);
  assert.deepEqual(plan.itinerary.map(d => d.date), ['2026-11-01', '2026-11-02', '2026-11-03']);
  assert.equal(plan.itinerary[0].destinationId, 'a');
});

test('天数非法（0 / 负数 / 31）被拦截', () => {
  for (const days of [0, -1, 31, 2.5]) {
    const r = planner.planTrip(CANDS, { startDate: '2026-11-01', days });
    assert.equal(r.ok, false, 'days=' + days);
    assert.equal(r.error, 'INVALID_INPUT');
  }
});

test('日期格式非法被拦截', () => {
  assert.equal(planner.planTrip(CANDS, { startDate: '2026/11/01', days: 2 }).ok, false);
  assert.equal(planner.planTrip(CANDS, { startDate: '2026-13-40', days: 2 }).ok, false);
});

test('无候选时返回 EMPTY_RESULT，不编造行程', () => {
  const r = planner.planTrip([], { startDate: '2026-11-01', days: 2 });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'EMPTY_RESULT');
});

test('人数与预算不改变日期结构', () => {
  const p1 = planner.planTrip(CANDS, { startDate: '2026-11-01', days: 4, people: 1, budgetTier: 'economy' });
  const p2 = planner.planTrip(CANDS, { startDate: '2026-11-01', days: 4, people: 6, budgetTier: 'comfort' });
  assert.deepEqual(p1.itinerary.map(d => d.date), p2.itinerary.map(d => d.date));
  assert.equal(p1.totalDays, 4);
});
