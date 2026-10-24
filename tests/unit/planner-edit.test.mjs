import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const edit = require('../../assets/js/services/planner-edit.js');

const days = [
  { date: '2026-12-30', destinationId: 'a', destinationName: '甲', activities: ['玩1'] },
  { date: '2026-12-31', destinationId: 'b', destinationName: '乙', activities: ['玩2'] },
  { date: '2027-01-01', destinationId: 'c', destinationName: '丙', activities: ['玩3'] },
];
const dest = { id: 'd', name: '丁', activities: ['玩4', '玩5', '玩6', '玩7'] };

test('上移：交换目的地三字段，日期序列不变，原数组不动', () => {
  const r = edit.moveDay(days, 1, -1);
  assert.equal(r.ok, true);
  assert.deepEqual(r.itinerary.map(d => d.destinationId), ['b', 'a', 'c']);
  assert.deepEqual(r.itinerary.map(d => d.date), ['2026-12-30', '2026-12-31', '2027-01-01']);
  assert.deepEqual(r.itinerary[0].activities, ['玩2']);
  assert.equal(days[0].destinationId, 'a');
});

test('下移边界：末项下移、首项上移、越界索引均拒绝', () => {
  assert.equal(edit.moveDay(days, 2, 1).ok, false);
  assert.equal(edit.moveDay(days, 0, -1).ok, false);
  assert.equal(edit.moveDay(days, 3, 1).ok, false);
  assert.equal(edit.moveDay(days, -1, -1).ok, false);
  assert.equal(edit.moveDay(days, 1, 0).ok, false);
});

test('插入：中间插入后后续日期顺延，活动取前 3 项', () => {
  const r = edit.insertDay(days, 0, dest);
  assert.equal(r.ok, true);
  assert.deepEqual(r.itinerary.map(d => d.destinationId), ['a', 'd', 'b', 'c']);
  assert.deepEqual(r.itinerary.map(d => d.date), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  assert.deepEqual(r.itinerary[1].activities, ['玩4', '玩5', '玩6']);
});

test('插入：跨年顺延与空行程首日（需 startDate）', () => {
  const r = edit.insertDay(days, 2, dest);
  assert.deepEqual(r.itinerary.map(d => d.date), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  const e = edit.insertDay([], -1, dest, '2026-02-28');
  assert.equal(e.ok, true);
  assert.equal(e.itinerary[0].date, '2026-02-28');
  assert.equal(edit.insertDay([], -1, dest).ok, false);
  assert.equal(edit.insertDay([], 0, dest, '2026-02-28').ok, false);
});

test('删除：删除后后续日期前移，删空返回空数组', () => {
  const r = edit.removeDay(days, 0);
  assert.deepEqual(r.itinerary.map(d => d.destinationId), ['b', 'c']);
  assert.deepEqual(r.itinerary.map(d => d.date), ['2026-12-30', '2026-12-31']);
  const one = [{ date: '2026-05-01', destinationId: 'a', destinationName: '甲', activities: [] }];
  assert.deepEqual(edit.removeDay(one, 0).itinerary, []);
  assert.equal(edit.removeDay(days, 5).ok, false);
});

test('非法输入：不存在的目的地、损坏行程均拒绝且不抛错', () => {
  assert.equal(edit.insertDay(days, 0, { id: '', name: 'x' }).ok, false);
  assert.equal(edit.insertDay(days, 0, null).ok, false);
  assert.equal(edit.moveDay(null, 0, 1).ok, false);
  assert.equal(edit.removeDay([{ date: 'bad', destinationId: 'a', destinationName: '甲' }], 0).ok, false);
});
