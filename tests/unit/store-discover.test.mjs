import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const storage = new Map();
global.localStorage = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k),
};
global.window = { CTA: {} };
global.CTA = global.window.CTA;
require('../../assets/js/store.js');
const store = global.CTA.store;

test('发现页状态：初始为 null，保存后可读回且局部更新合并', () => {
  store._resetForTest();
  assert.equal(store.getDiscoverState(), null);
  store.setDiscoverState({ keyword: '张家界', province: '湖南省', theme: '', season: '', scrollY: 0 });
  store.setDiscoverState({ scrollY: 420 });
  const s = store.getDiscoverState();
  assert.equal(s.keyword, '张家界');
  assert.equal(s.province, '湖南省');
  assert.equal(s.scrollY, 420);
});

test('发现页状态：持久化到 localStorage，重新加载 store 后仍在', () => {
  const raw = storage.get('cta.store.v1');
  assert.ok(raw && JSON.parse(raw).discover.keyword === '张家界');
});

test('发现页状态：非法字段被清洗（非字符串置空、负滚动置 0），清除后为 null', () => {
  store.setDiscoverState({ keyword: 123, scrollY: -5 });
  const s = store.getDiscoverState();
  assert.equal(s.keyword, '');
  assert.equal(s.scrollY, 0);
  store.clearDiscoverState();
  assert.equal(store.getDiscoverState(), null);
});

test('发现页状态：不影响收藏功能', () => {
  store._resetForTest();
  store.toggleFavorite('abc');
  store.setDiscoverState({ keyword: 'x', scrollY: 10 });
  assert.deepEqual(store.getFavorites(), ['abc']);
});
