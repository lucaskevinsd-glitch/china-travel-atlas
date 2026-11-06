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

function totalKm(plan) {
  return geo.analyzeItinerary(plan.itinerary, coordMap).totalKm;
}
function issues(plan) {
  return geo.analyzeItinerary(plan.itinerary, coordMap).issues;
}
function names(plan) {
  return plan.itinerary.map(d => d.destinationName);
}

test('1.B4 案例：无筛选 3 天，优化后总距离 2939km→65km，零提示', () => {
  const before = planner.planTrip(index, { startDate: '2026-11-02', days: 3 });
  const after = planner.planTrip(index, { startDate: '2026-11-02', days: 3 }, geo);
  assert.deepEqual(names(before), ['布达拉宫', '成都大熊猫繁育研究基地', '承德避暑山庄']);
  assert.equal(totalKm(before), 2939);
  assert.deepEqual(issues(before).map(i => i.level), ['warn', 'severe']);
  assert.deepEqual(names(after), ['杭州西湖', '杭州西湖', '乌镇']);
  assert.equal(totalKm(after), 65);
  assert.equal(issues(after).length, 0);
});

test('2.同一城市：黄山市（宏村+黄山）2 天，零提示', () => {
  const cands = index.filter(d => d.city === '黄山市');
  assert.equal(cands.length, 2);
  const plan = planner.planTrip(cands, { startDate: '2026-11-02', days: 2 }, geo);
  assert.equal(plan.ok, true);
  assert.equal(issues(plan).length, 0);
  assert.ok(totalKm(plan) <= 30, 'totalKm=' + totalKm(plan));
});

test('3.同一省份：四川 4 天，地理连续、零严重', () => {
  const cands = index.filter(d => d.province === '四川省');
  assert.equal(cands.length, 4);
  const plan = planner.planTrip(cands, { startDate: '2026-11-02', days: 4 }, geo);
  assert.equal(plan.ok, true);
  assert.ok(!issues(plan).some(i => i.level === 'severe'), JSON.stringify(issues(plan)));
  /* 峨眉山 min=2 占两天，4 天只能装 3 个不同目的地；地理链应为 成都→峨眉→稻城。
     用最大单腿距离比较（totalKm 会被同地连住的 0km 腿稀释，不可比）。 */
  const distinct = [...new Set(names(plan))];
  assert.deepEqual(distinct, ['成都大熊猫繁育研究基地', '峨眉山', '稻城亚丁']);
  const maxLeg = p => Math.max(...geo.analyzeItinerary(p.itinerary, coordMap).legs.filter(l => l.km != null).map(l => l.km));
  const alpha = planner.planTrip(cands, { startDate: '2026-11-02', days: 4 });
  assert.ok(maxLeg(plan) < maxLeg(alpha), `geo max leg=${Math.round(maxLeg(plan))} alpha max leg=${Math.round(maxLeg(alpha))}`);
});

test('4.多个相邻省份：桂+湘+鄂（漓江/张家界/恩施）3 天，零警告以上', () => {
  const ids = ['li-river', 'zhangjiajie-national-forest-park', 'enshi-grand-canyon'];
  const cands = ids.map(id => byId[id]);
  const plan = planner.planTrip(cands, { startDate: '2026-11-02', days: 3 }, geo);
  assert.equal(plan.ok, true);
  assert.ok(!issues(plan).some(i => i.level === 'warn' || i.level === 'severe'), JSON.stringify(issues(plan)));
  assert.ok(totalKm(plan) < 800, 'totalKm=' + totalKm(plan));
});

test('5.横跨多个区域：5 个远区点，地理排序后总距离短于字母顺序', () => {
  const ids = ['harbin-central-street', 'kashgar-old-city', 'yalong-bay', 'potala-palace', 'the-bund-shanghai'];
  const cands = ids.map(id => byId[id]);
  /* 各点 max 合计 8 天（亚龙湾 max=3、喀什 max=2），用 8 天才能装下全部 5 个 */
  const after = planner.planTrip(cands, { startDate: '2026-11-02', days: 8 }, geo);
  const before = planner.planTrip(cands, { startDate: '2026-11-02', days: 8 });
  assert.equal(after.ok, true);
  assert.equal(new Set(names(after)).size, 5, '5 个目的地都应保留');
  assert.ok(totalKm(after) < totalKm(before), `geo=${totalKm(after)} alpha=${totalKm(before)}`);
});

test('6.用户明确指定的远距离目的地：pinned 拉萨+成都，两者都保留且顺序不变', () => {
  const plan = planner.planTrip(index, { startDate: '2026-11-02', days: 2, pinned: ['potala-palace', 'chengdu-panda-base'] }, geo);
  assert.equal(plan.ok, true);
  assert.deepEqual(names(plan), ['布达拉宫', '成都大熊猫繁育研究基地']);
  /* 用户明确要求，B4 检测应给出提示（不删除、不掩盖） */
  assert.equal(issues(plan).length, 1);
  assert.equal(issues(plan)[0].level, 'warn');
});

test('7.用户指定固定先后顺序：pinned 外滩→故宫→沈阳，顺序不得改变', () => {
  const pinned = ['the-bund-shanghai', 'forbidden-city', 'shenyang-imperial-palace'];
  const plan = planner.planTrip(index, { startDate: '2026-11-02', days: 3, pinned }, geo);
  assert.equal(plan.ok, true);
  assert.deepEqual(names(plan), ['外滩', '故宫博物院', '沈阳故宫']);
});

test('8.缺失坐标的目的地：仍可进入行程，不参与距离优化，不崩溃', () => {
  const cands = [
    { ...byId['west-lake-hangzhou'] },
    { id: 'no-coord-place', name: '无坐标地', themes: ['nature'], bestSeasons: ['spring'], suggestedDays: { min: 1, max: 1 }, activities: [] },
    { ...byId['wuzhen'] },
  ];
  /* 西湖 max=2 占两天，故用 4 天才能装下 3 个目的地；无坐标地在本层末尾，仍可进入行程 */
  const plan = planner.planTrip(cands, { startDate: '2026-11-02', days: 4 }, geo);
  assert.equal(plan.ok, true);
  assert.equal(plan.itinerary.length, 4);
  assert.ok(names(plan).includes('无坐标地'), '无坐标地应保留');
  /* 有坐标的链路仍地理连续（西湖→乌镇），无坐标地在末尾 */
  assert.deepEqual(names(plan), ['杭州西湖', '杭州西湖', '乌镇', '无坐标地']);
  /* 无坐标地应触发 B4 的 missing 提示（信息级），但不应产生距离类提示 */
  const iss = issues(plan);
  assert.equal(iss.length, 1);
  assert.equal(iss[0].kind, 'missing');
  assert.equal(iss[0].level, 'info');
});

test('9.候选不足以形成连续路线：仅 2 个远点，仍正常生成', () => {
  const cands = [byId['harbin-central-street'], byId['yalong-bay']];
  const plan = planner.planTrip(cands, { startDate: '2026-11-02', days: 2 }, geo);
  assert.equal(plan.ok, true);
  assert.equal(plan.itinerary.length, 2);
  assert.equal(new Set(names(plan)).size, 2);
});

test('10.不同旅行主题：nature 与 historic 均尊重主题、且地理排序', () => {
  for (const theme of ['nature', 'historic']) {
    const plan = planner.planTrip(index, { startDate: '2026-11-02', days: 3, theme }, geo);
    assert.equal(plan.ok, true);
    /* 前 3 天的目的地都应匹配该主题（分数优先于地理） */
    plan.itinerary.forEach(d => {
      assert.ok(byId[d.destinationId].themes.includes(theme), d.destinationName + ' 应匹配主题 ' + theme);
    });
    const alpha = planner.planTrip(index, { startDate: '2026-11-02', days: 3, theme });
    assert.ok(totalKm(plan) <= totalKm(alpha), `${theme}: geo=${totalKm(plan)} alpha=${totalKm(alpha)}`);
  }
});

test('12.重复生成稳定：同一输入两次结果完全相同', () => {
  const input = { startDate: '2026-11-02', days: 5, theme: 'nature', season: 'autumn' };
  const a = planner.planTrip(index, input, geo);
  const b = planner.planTrip(index, input, geo);
  assert.deepEqual(a.itinerary, b.itinerary);
});

test('无 geoApi 时退回原有顺序（向后兼容）', () => {
  const plan = planner.planTrip(index, { startDate: '2026-11-02', days: 3 });
  assert.deepEqual(names(plan), ['布达拉宫', '成都大熊猫繁育研究基地', '承德避暑山庄']);
});

test('orderByGeography：分数分层不被地理覆盖', () => {
  /* 高分者（theme 匹配）即使地理上远，也排在低分者之前 */
  const scored = [
    { d: byId['potala-palace'], s: 10 },
    { d: byId['west-lake-hangzhou'], s: 10 },
    { d: byId['wuzhen'], s: 0 },
    { d: byId['suzhou-humble-garden'], s: 0 },
  ];
  const out = geo.orderByGeography(scored);
  /* 前两项是 10 分组，后两项是 0 分组：分数分层不被地理覆盖 */
  assert.ok(out.slice(0, 2).every(x => x.s === 10));
  assert.ok(out.slice(2).every(x => x.s === 0));
  /* 0 分组内地理连续：乌镇（离西湖 65km）在苏州之前 */
  assert.deepEqual(out.slice(2).map(x => x.d.id), ['wuzhen', 'suzhou-humble-garden']);
});
