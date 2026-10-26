import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
global.CTA = { store: { isFavorite: () => false } };
global.window = { CTA: global.CTA };
global.document = {
  addEventListener() {},
  querySelector: () => null,
  createElement: () => ({ classList: { add() {} }, setAttribute() {} }),
  body: { appendChild() {} },
};
require('../../assets/js/ui.js');

test('seasonLabel：四季映射与未知值回落', () => {
  assert.equal(global.CTA.ui.seasonLabel('spring'), '春季');
  assert.equal(global.CTA.ui.seasonLabel('winter'), '冬季');
  assert.equal(global.CTA.ui.seasonLabel('unknown'), 'unknown');
});

test('cardMeta：天数与适游季节齐全时拼接，缺失时不输出', () => {
  const full = global.CTA.ui.cardMeta({ suggestedDays: { min: 2, max: 3 }, bestSeasons: ['spring', 'autumn'] });
  assert.match(full, /建议 2–3 天/);
  assert.match(full, /适游春季、秋季/);
  assert.equal(global.CTA.ui.cardMeta({}), '');
  assert.equal(global.CTA.ui.cardMeta({ bestSeasons: [] }), '');
});

test('destCard：卡片含比较信息（天数/季节），且不破坏原有结构', () => {
  const html = global.CTA.ui.destCard({
    id: 'huangshan', name: '黄山风景区', province: '安徽省', city: '黄山市',
    summary: '奇松怪石。', themes: ['nature'], coverThumb: 'x.webp',
    suggestedDays: { min: 2, max: 3 }, bestSeasons: ['spring'],
  });
  assert.match(html, /card-meta/);
  assert.match(html, /建议 2–3 天 · 适游春季/);
  assert.match(html, /#\/dest\/huangshan/);
});
