import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRecordText, EXPECTED_VERDICTS } from '../../tools/audit-candidates.mjs';

test('审计口径表覆盖 30 条且分布为 23/7/0', () => {
  const vals = Object.values(EXPECTED_VERDICTS);
  assert.equal(vals.length, 30);
  assert.equal(vals.filter(v => v === '已核实').length, 23);
  assert.equal(vals.filter(v => v === '已修正').length, 7);
  assert.equal(vals.filter(v => v === '初审通过').length, 0);
});

test('广州塔北岸旧表述会被检出', () => {
  const bad = { id: 'canton-tower', summary: '广州塔位于珠江北岸。', transportNotes: '', location: {} };
  assert.ok(checkRecordText(bad).length > 0);
  const good = { id: 'canton-tower', summary: '广州塔位于广州市海珠区、珠江南岸。', transportNotes: '', location: {} };
  assert.equal(checkRecordText(good).length, 0);
});

test('青海湖鸟岛旧表述会被检出', () => {
  const bad = { id: 'qinghai-lake', summary: '环湖有二郎剑、鸟岛等景区点位。', transportNotes: '', location: {} };
  assert.ok(checkRecordText(bad).length > 0);
});

test('长白山坐标偏离天文峰观景点会被检出', () => {
  const bad = { id: 'changbaishan-tianchi', summary: '北坡可观天池。', transportNotes: '', location: { lat: 42.006, lng: 128.055 } };
  assert.ok(checkRecordText(bad).length > 0);
  const good = { id: 'changbaishan-tianchi', summary: '北坡、西坡均可登临观天池。', transportNotes: '', location: { lat: 42.0265, lng: 128.0669 } };
  assert.equal(checkRecordText(good).length, 0);
});
