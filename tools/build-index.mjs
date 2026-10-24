#!/usr/bin/env node
/* 由各省详情分片生成 destinations-index.json 与 meta.json。
 * 规则：只收 status=published；以 _ 开头的文件（如 _examples.json 草案）不参与；
 * index 为轻量字段，coverThumb 取第一张图 thumb，无图为 null。
 * 用法: node tools/build-index.mjs（先跑 validate-data.mjs，校验不过不要生成） */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = p => JSON.parse(readFileSync(join(root, p), 'utf8'));

const destDir = join(root, 'data/destinations');
const files = readdirSync(destDir).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort();
const index = [];
const counts = {};
for (const f of files) {
  const shard = basename(f, '.json');
  const list = readJson('data/destinations/' + f);
  for (const d of list) {
    if (d.status !== 'published') continue;
    counts[d.province] = (counts[d.province] || 0) + 1;
    index.push({
      id: d.id, name: d.name, province: d.province, city: d.city, district: d.district || null,
      type: d.type, themes: d.themes, bestSeasons: d.bestSeasons, suggestedDays: d.suggestedDays,
      summary: d.summary, coverThumb: d.images && d.images[0] ? d.images[0].thumb : null,
      coverFull: d.images && d.images[0] ? d.images[0].src : null, shard,
    });
  }
}
index.sort((a, b) => a.province.localeCompare(b.province, 'zh') || a.name.localeCompare(b.name, 'zh'));
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, 'data/destinations-index.json'), JSON.stringify(index, null, 1) + '\n');
writeFileSync(join(root, 'data/meta.json'), JSON.stringify({
  schemaVersion: 1, dataVersion: today, updated: today,
  counts: { published: index.length, byProvince: counts },
}, null, 1) + '\n');
console.log(`已生成 index：${index.length} 条 published`);
