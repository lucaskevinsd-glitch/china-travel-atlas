import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
global.CTA = {};
global.window = { CTA: global.CTA };
const ds = require('../../assets/js/data-service.js');

const LIST = [
  { id: 'zhangjiajie', name: '张家界国家森林公园', province: '湖南省', city: '张家界市', type: 'mountain', themes: ['nature'], bestSeasons: ['autumn'], suggestedDays: { min: 2, max: 3 } },
  { id: 'west-lake', name: '杭州西湖', province: '浙江省', city: '杭州市', type: 'cultural', themes: ['historic'], bestSeasons: ['spring'], suggestedDays: { min: 1, max: 2 } },
  { id: 'lijiang', name: '丽江古城', province: '云南省', city: '丽江市', type: 'historic', themes: ['ancient-town'], bestSeasons: ['spring', 'autumn'], suggestedDays: { min: 1, max: 2 } },
];

test('搜索“张家界”只返回名称/城市命中的结果', () => {
  const r = ds.searchDestinations(LIST, '张家界');
  assert.deepEqual(r.map(d => d.id), ['zhangjiajie']);
});

test('组合筛选 省+主题+季节 与预期逐 ID 一致', () => {
  const r = ds.filterDestinations(LIST, { province: '云南省', theme: 'ancient-town', season: 'autumn' });
  assert.deepEqual(r.map(d => d.id), ['lijiang']);
  const none = ds.filterDestinations(LIST, { province: '云南省', season: 'winter' });
  assert.equal(none.length, 0);
});

test('空关键词返回全部；maxDays 按建议天数下限过滤', () => {
  assert.equal(ds.searchDestinations(LIST, '').length, 3);
  const r = ds.filterDestinations(LIST, { maxDays: 1 });
  assert.deepEqual(r.map(d => d.id), ['west-lake', 'lijiang']);
});
