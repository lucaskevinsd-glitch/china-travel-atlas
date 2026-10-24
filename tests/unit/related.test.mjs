import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
global.window = { CTA: {} };
global.CTA = global.window.CTA;
require('../../assets/js/pages-detail.js');
const relatedFor = global.CTA.pages._relatedFor;

const E = (id, province, type, themes) => ({ id, province, type, themes });
const pool = [
  E('cur', '湖南省', 'mountain', ['nature', 'hiking']),
  E('same-prov', '湖南省', 'urban', []),
  E('theme-2', '四川省', 'natural', ['nature', 'hiking']),
  E('theme-1-type', '云南省', 'mountain', ['nature']),
  E('none', '北京市', 'historic', ['historic']),
  E('theme-1', '贵州省', 'natural', ['nature']),
];

test('相关推荐：不含自身，同省且有共同主题居首', () => {
  const pool2 = [...pool, E('same-prov-theme', '湖南省', 'urban', ['nature'])];
  const out = relatedFor(pool2, 'cur', 4).map(e => e.id);
  assert.ok(!out.includes('cur'));
  assert.equal(out[0], 'same-prov-theme'); // 3+2=5 分
  assert.equal(out[1], 'theme-2'); // 4 分
});

test('相关推荐：双主题(4分)高于同省(3分)，同类型有加分', () => {
  const out = relatedFor(pool, 'cur', 10).map(e => e.id);
  assert.deepEqual(out, ['theme-2', 'same-prov', 'theme-1-type']);
});

test('相关推荐：score < 3 的泛匹配被过滤，宁缺毋滥', () => {
  // 仅共享 family 的 2 分档（如亚龙湾→漓江）不再出现；3 分档（同类型+1主题）保留
  const out = relatedFor(pool, 'cur', 10).map(e => e.id);
  assert.ok(!out.includes('theme-1'));
  assert.ok(!out.includes('none'));
  assert.ok(out.includes('same-prov')); // 3 分保留
  const beach = [E('yalong', '海南省', 'coastal', ['coastal', 'family']),
    E('gulangyu', '福建省', 'coastal', ['coastal', 'family']),
    E('li', '广西壮族自治区', 'natural', ['nature', 'family']),
    E('qh', '青海省', 'natural', ['nature', 'family'])];
  assert.deepEqual(relatedFor(beach, 'yalong', 4).map(e => e.id), ['gulangyu']);
});

test('相关推荐：limit 生效且条目不足时优雅返回全部', () => {
  assert.equal(relatedFor(pool, 'cur', 2).length, 2);
  assert.equal(relatedFor([pool[0]], 'cur', 4).length, 0);
  assert.deepEqual(relatedFor([], 'cur', 4), []);
  assert.deepEqual(relatedFor(pool, 'missing-id', 4), []);
});
