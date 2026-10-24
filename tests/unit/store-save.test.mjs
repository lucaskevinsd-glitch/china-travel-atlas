import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const storage = new Map();
let throwing = false;
global.localStorage = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => { if (throwing) throw new Error('quota'); storage.set(k, String(v)); },
  removeItem: k => storage.delete(k),
};
global.window = { CTA: {} };
global.CTA = global.window.CTA;
require('../../assets/js/store.js');
const store = global.CTA.store;

test('setPlanDraft 成功时返回 true 且可读回', () => {
  store._resetForTest();
  const plan = { ok: true, startDate: '2026-11-02', days: 2, itinerary: [] };
  assert.equal(store.setPlanDraft({ savedAt: '2026-10-24T00:00:00.000Z', from: '上海', plan }), true);
  assert.equal(store.getPlanDraft().plan.days, 2);
});

test('存储写入失败时返回 false，但内存草案仍保留（不谎称已保存）', () => {
  throwing = true;
  const plan = { ok: true, startDate: '2026-11-02', days: 1, itinerary: [] };
  assert.equal(store.setPlanDraft({ savedAt: '2026-10-24T00:00:00.000Z', from: '', plan }), false);
  assert.equal(store.getPlanDraft().plan.days, 1);
  throwing = false;
  assert.equal(store.setPlanDraft({ savedAt: '2026-10-24T00:00:00.000Z', from: '', plan }), true);
});

test('旧草案兼容：模块重载后无 edited 字段的旧草案原样读回', () => {
  storage.set('cta.store.v1', JSON.stringify({ schema: 1, favorites: [], planDraft: { savedAt: '2026-10-20T00:00:00.000Z', from: '北京', plan: { ok: true, startDate: '2026-11-01', days: 1, itinerary: [{ date: '2026-11-01', destinationId: 'x', destinationName: '某地', activities: [] }] } }, discover: null }));
  delete require.cache[require.resolve('../../assets/js/store.js')];
  require('../../assets/js/store.js');
  const reloaded = global.CTA.store.getPlanDraft();
  assert.equal(reloaded.edited, undefined);
  assert.equal(reloaded.plan.itinerary[0].destinationName, '某地');
});

test('损坏的本地存储仍降级为空状态，不抛错', () => {
  storage.set('cta.store.v1', '{broken json');
  store._resetForTest();
  assert.equal(store.getPlanDraft(), null);
});
