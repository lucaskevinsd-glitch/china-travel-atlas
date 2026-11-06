import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const geo = require('../../assets/js/services/planner-geo.js');

/* 真实坐标：从索引读（与产品同源），只取测试需要的几条。 */
const index = JSON.parse(readFileSync(new URL('../../data/destinations-index.json', import.meta.url), 'utf8'));
const coordMap = {};
index.forEach(d => { coordMap[d.id] = geo.coordOf(d); });

function itin(days) {
  return days.map(([id, date], i) => ({
    date: date || ('2026-11-0' + (i + 1)),
    destinationId: id,
    destinationName: (index.find(d => d.id === id) || { name: id }).name,
    activities: [],
  }));
}

test('Haversine：拉萨→成都约 1256km，北京→上海约 1069km', () => {
  const a = geo.haversineKm(coordMap['potala-palace'], coordMap['chengdu-panda-base']);
  assert.ok(Math.abs(a - 1256) < 20, '拉萨-成都=' + a);
  const b = geo.haversineKm(coordMap['forbidden-city'], coordMap['the-bund-shanghai']);
  assert.ok(Math.abs(b - 1069) < 20, '北京-上海=' + b);
  assert.equal(geo.haversineKm(null, coordMap['forbidden-city']), null);
  assert.equal(geo.haversineKm({ lat: 100, lng: 0 }, coordMap['forbidden-city']), null);
});

test('coordOf：有效取坐标，缺失/非法返回 null', () => {
  assert.deepEqual(geo.coordOf({ location: { lat: 30, lng: 120, coordSystem: 'WGS-84' } }), { lat: 30, lng: 120 });
  assert.equal(geo.coordOf({}), null);
  assert.equal(geo.coordOf({ location: { lat: 'x', lng: 120 } }), null);
  assert.equal(geo.coordOf(null), null);
});

test('B0 案例：拉萨→成都相邻两天为警告（warn），1256km', () => {
  const r = geo.analyzeItinerary(itin([['potala-palace'], ['chengdu-panda-base']]), coordMap);
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].kind, 'adjacent');
  assert.equal(r.issues[0].level, 'warn');
  assert.ok(r.issues[0].detail.includes('1256'), r.issues[0].detail);
});

test('同一城市/邻省近距离不误报：宏村→黄山 22km、宏村→篁岭 77km', () => {
  const r1 = geo.analyzeItinerary(itin([['hongcun'], ['huangshan']]), coordMap);
  assert.equal(r1.issues.length, 0);
  const r2 = geo.analyzeItinerary(itin([['hongcun'], ['wuyuan-huangling']]), coordMap);
  assert.equal(r2.issues.length, 0);
});

test('同省可远：喀什→喀纳斯 1358km 为警告（不只看跨省）', () => {
  const r = geo.analyzeItinerary(itin([['kashgar-old-city'], ['kanas-lake']]), coordMap);
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].level, 'warn');
});

test('极端跨越：哈尔滨→亚龙湾 3440km 为严重（severe）', () => {
  const r = geo.analyzeItinerary(itin([['harbin-central-street'], ['yalong-bay']]), coordMap);
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].level, 'severe');
});

test('提示级：北京→平遥 475km 为 info', () => {
  const r = geo.analyzeItinerary(itin([['forbidden-city'], ['pingyao-ancient-city']]), coordMap);
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].level, 'info');
});

test('同一天多个远距离景点：同日北京+上海为严重', () => {
  const days = [
    { date: '2026-11-01', destinationId: 'forbidden-city', destinationName: '故宫博物院', activities: [] },
    { date: '2026-11-01', destinationId: 'the-bund-shanghai', destinationName: '外滩', activities: [] },
  ];
  const r = geo.analyzeItinerary(days, coordMap);
  const same = r.issues.filter(i => i.kind === 'same-day');
  assert.equal(same.length, 1);
  assert.equal(same[0].level, 'severe');
});

test('坐标缺失：未知目的地标记为无法计算，不崩溃', () => {
  const days = [
    { date: '2026-11-01', destinationId: 'forbidden-city', destinationName: '故宫博物院', activities: [] },
    { date: '2026-11-02', destinationId: 'no-such-place', destinationName: '不存在的地方', activities: [] },
  ];
  const r = geo.analyzeItinerary(days, coordMap);
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].kind, 'missing');
  assert.equal(r.issues[0].level, 'info');
});

test('绕路：北京→上海→沈阳，经上海比直达多 1627km，提示绕路', () => {
  const r = geo.analyzeItinerary(itin([['forbidden-city'], ['the-bund-shanghai'], ['shenyang-imperial-palace']]), coordMap);
  const d = r.issues.filter(i => i.kind === 'detour');
  assert.equal(d.length, 1);
  assert.equal(d[0].level, 'info');
});

test('重排建议：九寨沟→上海→成都，NN 顺序省 1384km（42%）', () => {
  const days = itin([['jiuzhaigou'], ['the-bund-shanghai'], ['chengdu-panda-base']]);
  const s = geo.suggestOrder(days, coordMap);
  assert.ok(s, '应给出建议');
  assert.deepEqual(s.order, [0, 2, 1]);
  assert.ok(s.savedKm > 1000, 'savedKm=' + s.savedKm);
  assert.ok(s.savedPct >= 40, 'savedPct=' + s.savedPct);
  const applied = geo.applyOrder(days, s.order);
  assert.deepEqual(applied.map(d => d.destinationId), ['jiuzhaigou', 'chengdu-panda-base', 'the-bund-shanghai']);
  assert.deepEqual(applied.map(d => d.date), ['2026-11-01', '2026-11-02', '2026-11-03']);
});

test('重排建议：已顺路的行程不建议（宏村→黄山→篁岭）', () => {
  const days = itin([['hongcun'], ['huangshan'], ['wuyuan-huangling']]);
  assert.equal(geo.suggestOrder(days, coordMap), null);
});

test('applyOrder：非法顺序返回 null', () => {
  const days = itin([['hongcun'], ['huangshan']]);
  assert.equal(geo.applyOrder(days, [0, 0]), null);
  assert.equal(geo.applyOrder(days, [0]), null);
});
