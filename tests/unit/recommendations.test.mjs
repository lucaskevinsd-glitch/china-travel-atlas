import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const geo = require('../../assets/js/services/planner-geo.js');
const rec = require('../../assets/js/services/recommendations.js');

/* 真实索引数据（与产品同源）与真实标签。 */
const index = JSON.parse(readFileSync(new URL('../../data/destinations-index.json', import.meta.url), 'utf8'));
const themesDoc = JSON.parse(readFileSync(new URL('../../data/themes.json', import.meta.url), 'utf8'));
const labels = { themes: {}, types: {} };
themesDoc.themes.forEach(t => { labels.themes[t.id] = t.label; });
themesDoc.types.forEach(t => { labels.types[t.id] = t.label; });
const byId = {};
index.forEach(d => { byId[d.id] = d; });
const ids = r => r.map(x => x.dest.id);

test('1.杭州西湖附近：乌镇 65km 居首，全部 ≤300km 且按距离升序', () => {
  const r = rec.getRecommendations(index, 'west-lake-hangzhou', geo, labels);
  assert.ok(r.nearby.length >= 2, '西湖附近应有多个');
  assert.equal(r.nearby[0].dest.id, 'wuzhen');
  assert.ok(Math.abs(r.nearby[0].km - 65) < 1, '乌镇约 65km，实测=' + r.nearby[0].km);
  assert.ok(r.nearby.every(x => x.km <= 300));
  const kms = r.nearby.map(x => x.km);
  assert.deepEqual(kms, [...kms].sort((a, b) => a - b), '按距离升序');
  assert.ok(r.nearby[0].reason.includes('65'), '理由含距离：' + r.nearby[0].reason);
  assert.ok(r.nearby[0].reason.includes('直线距离'), '理由明确为直线距离，不冒充道路距离');
});

test('2.宏村附近：黄山 22km 居首，婺源篁岭 77km 其次', () => {
  const r = rec.getRecommendations(index, 'hongcun', geo, labels);
  assert.equal(r.nearby[0].dest.id, 'huangshan');
  assert.ok(Math.abs(r.nearby[0].km - 22) < 1, '黄山约 22km，实测=' + r.nearby[0].km);
  assert.equal(r.nearby[1].dest.id, 'wuyuan-huangling');
  assert.ok(Math.abs(r.nearby[1].km - 77) < 1, '篁岭约 77km，实测=' + r.nearby[1].km);
});

test('3.成都目的地附近：峨眉山 156km 居首，九寨沟 281km 在列', () => {
  const r = rec.getRecommendations(index, 'chengdu-panda-base', geo, labels);
  assert.equal(r.nearby[0].dest.id, 'mount-emei');
  assert.ok(Math.abs(r.nearby[0].km - 156) < 2, '峨眉山约 156km，实测=' + r.nearby[0].km);
  assert.ok(ids(r.nearby).includes('jiuzhaigou'), '九寨沟 281km 在 300km 内');
});

test('4.九寨沟相似体验：均为自然山水（丹霞/漓江/黄果树/青海湖），理由具体', () => {
  const r = rec.getRecommendations(index, 'jiuzhaigou', geo, labels);
  assert.ok(r.similar.length >= 3);
  assert.ok(ids(r.similar).includes('li-river'));
  assert.ok(ids(r.similar).includes('huangguoshu-waterfall'));
  r.similar.forEach(x => {
    assert.ok(x.reason.includes('共同主题'), '理由须具体指出共同主题：' + x.reason);
    assert.ok(!x.reason.includes('风景优美'), '理由不得空洞');
  });
});

test('5.乌镇相似体验：西江千户苗寨、婺源篁岭、宏村均为古镇/乡村，洪崖洞被排除', () => {
  const r = rec.getRecommendations(index, 'wuzhen', geo, labels);
  const got = ids(r.similar);
  assert.ok(got.includes('xijiang-miao-village'));
  assert.ok(got.includes('wuyuan-huangling'));
  assert.ok(got.includes('hongcun'));
  assert.ok(!got.includes('hongya-cave'), '洪崖洞仅共享摄影/家庭两个通用主题，不得进入相似体验');
  assert.ok(r.similar[0].reason.includes('古镇'), '理由须点明古镇主题：' + r.similar[0].reason);
});

test('6.缺少坐标的目的地：M1 为空，M2/M3 仍正常，无伪造距离', () => {
  const noCoord = index.map(d => ({ ...d, location: undefined }));
  const r = rec.getRecommendations(noCoord, 'west-lake-hangzhou', geo, labels);
  assert.deepEqual(r.nearby, [], '无坐标时 M1 为空');
  assert.ok(r.similar.length > 0, 'M2 仍可按主题推荐');
  assert.ok(r.extended.length > 0, 'M3 仍可按主题/地区推荐');
  const allReasons = [...r.similar, ...r.extended].map(x => x.reason).join(' ');
  assert.ok(!allReasons.includes('直线距离'), '无坐标时不得出现距离描述');
  /* geoApi 缺失时同样不伪造距离 */
  const r2 = rec.getRecommendations(index, 'west-lake-hangzhou', null, labels);
  assert.deepEqual(r2.nearby, []);
  assert.ok(r2.similar.length > 0);
});

test('7.缺少主题标签的目的地：不虚构匹配关系', () => {
  const stripped = index.map(d => d.id === 'west-lake-hangzhou' ? { ...d, themes: [] } : d);
  const r = rec.getRecommendations(stripped, 'west-lake-hangzhou', geo, labels);
  /* 西湖无主题时，M2 只能靠同类型（cultural +3 < 阈值 4）匹配，故应为空 */
  assert.deepEqual(r.similar, [], '无主题且无足够类型分时 M2 为空，不虚构');
  /* M1 不受主题影响，仍正常 */
  assert.ok(r.nearby.length > 0);
});

test('8.只有少量匹配结果的目的地：不凑数', () => {
  const r = rec.getRecommendations(index, 'yalong-bay', geo, labels);
  assert.deepEqual(r.nearby, [], '亚龙湾 300km 内无邻居，M1 为空不凑数');
  assert.equal(r.similar.length, 2, '亚龙湾 M2 仅鼓浪屿与青岛，实测=' + r.similar.length);
  assert.deepEqual(ids(r.similar), ['gulangyu', 'qingdao-badaguan-zhanqiao']);
  assert.deepEqual(r.extended, [], '亚龙湾 M3 为空不凑数');
});

test('9.当前目的地不会推荐自己（全站 42 条逐一验证）', () => {
  index.forEach(d => {
    const r = rec.getRecommendations(index, d.id, geo, labels);
    assert.ok(!ids(r.nearby).includes(d.id), d.id + ' M1 含自身');
    assert.ok(!ids(r.similar).includes(d.id), d.id + ' M2 含自身');
    assert.ok(!ids(r.extended).includes(d.id), d.id + ' M3 含自身');
  });
});

test('10.不会重复推荐相同目的地（三层之间去重，全站逐一验证）', () => {
  index.forEach(d => {
    const r = rec.getRecommendations(index, d.id, geo, labels);
    const all = [...ids(r.nearby), ...ids(r.similar), ...ids(r.extended)];
    assert.equal(new Set(all).size, all.length, d.id + ' 三层有重复：' + all.join(','));
  });
});

test('11.不同目的地的推荐结果确实存在合理差异', () => {
  const a = rec.getRecommendations(index, 'west-lake-hangzhou', geo, labels);
  const b = rec.getRecommendations(index, 'jiuzhaigou', geo, labels);
  const c = rec.getRecommendations(index, 'wuzhen', geo, labels);
  const key = r => [...ids(r.nearby), ...ids(r.similar), ...ids(r.extended)].join(',');
  assert.notEqual(key(a), key(b));
  assert.notEqual(key(a), key(c));
  assert.notEqual(key(b), key(c));
  /* 且各自的首选与自身相关：西湖首选附近为乌镇，九寨沟相似含漓江 */
  assert.equal(a.nearby[0].dest.id, 'wuzhen');
  assert.ok(ids(b.similar).includes('li-river'));
});

test('12.推荐结果稳定复现：同一输入两次调用完全相同', () => {
  const a = rec.getRecommendations(index, 'huangshan', geo, labels);
  const b = rec.getRecommendations(index, 'huangshan', geo, labels);
  assert.deepEqual(JSON.stringify(a), JSON.stringify(b));
});

test('M2 多样性：同一类型至多 3 张；M3 不与 M1/M2 重复', () => {
  index.forEach(d => {
    const r = rec.getRecommendations(index, d.id, geo, labels);
    const typeCount = {};
    r.similar.forEach(x => { typeCount[x.dest.type] = (typeCount[x.dest.type] || 0) + 1; });
    Object.entries(typeCount).forEach(([t, n]) => assert.ok(n <= 3, d.id + ' M2 类型 ' + t + ' 有 ' + n + ' 张'));
    assert.ok(r.similar.length <= 4 && r.extended.length <= 4 && r.nearby.length <= 4, '每层至多 4 张');
  });
});

test('不存在的目的地与空输入：返回空三层，不抛错', () => {
  assert.deepEqual(rec.getRecommendations(index, 'no-such-place', geo, labels), { nearby: [], similar: [], extended: [] });
  assert.deepEqual(rec.getRecommendations([], 'west-lake-hangzhou', geo, labels), { nearby: [], similar: [], extended: [] });
  assert.deepEqual(rec.getRecommendations(null, 'west-lake-hangzhou', geo, labels), { nearby: [], similar: [], extended: [] });
});
