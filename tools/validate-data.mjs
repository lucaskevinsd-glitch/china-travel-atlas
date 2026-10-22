#!/usr/bin/env node
/* 目的地数据校验（零依赖，按 schemas/destination.schema.json 实现）。
 * 用法: node tools/validate-data.mjs [--check-index]
 * 退出码: 有 error 时 1，否则 0。warning 不阻断（如 draft 的待核验项）。 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = p => JSON.parse(readFileSync(join(root, p), 'utf8'));

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`[${where}] ${msg}`);
const warn = (where, msg) => warnings.push(`[${where}] ${msg}`);

const themesDoc = readJson('data/themes.json');
const provincesDoc = readJson('data/provinces.json');
const themeIds = new Set(themesDoc.themes.map(t => t.id));
const seasonIds = new Set(themesDoc.seasons.map(s => s.id));
const typeIds = new Set(themesDoc.types.map(t => t.id));
const provinceNames = new Set(provincesDoc.provinces.map(p => p.name));

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const seenIds = new Map();

function isDate(s) { return typeof s === 'string' && DATE_RE.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')); }

function validateDestination(d, where) {
  const at = `${where}:${d && d.id ? d.id : '?'}`;
  if (!d || typeof d !== 'object') { err(at, '记录不是对象'); return; }
  const required = ['id', 'name', 'province', 'city', 'location', 'type', 'themes', 'summary', 'highlights', 'bestSeasons', 'suggestedDays', 'activities', 'transportNotes', 'images', 'source', 'verifiedAt', 'status'];
  for (const k of required) if (!(k in d)) err(at, `缺少必填字段 ${k}`);
  if (errors.length && !d.id) return;

  if (typeof d.id !== 'string' || !ID_RE.test(d.id)) err(at, 'id 不符合 ^[a-z0-9]+(-[a-z0-9]+)*$');
  else {
    if (seenIds.has(d.id)) err(at, `id 与 ${seenIds.get(d.id)} 重复`);
    else seenIds.set(d.id, where);
  }
  if (typeof d.name !== 'string' || !d.name) err(at, 'name 为空');
  if (!provinceNames.has(d.province)) err(at, `province「${d.province}」不在 provinces.json`);
  if (typeof d.city !== 'string' || !d.city) err(at, 'city 为空');
  if ('district' in d && d.district !== null && typeof d.district !== 'string') err(at, 'district 须为 string 或 null');

  const loc = d.location || {};
  if (typeof loc.lat !== 'number' || loc.lat < 3 || loc.lat > 54) err(at, `lat ${loc.lat} 超出中国大陆粗界 [3,54]`);
  if (typeof loc.lng !== 'number' || loc.lng < 73 || loc.lng > 136) err(at, `lng ${loc.lng} 超出中国大陆粗界 [73,136]`);
  if (!['GCJ-02', 'WGS-84'].includes(loc.coordSystem)) err(at, 'coordSystem 须为 GCJ-02 或 WGS-84');

  if (!typeIds.has(d.type)) err(at, `type「${d.type}」不在枚举`);
  if (!Array.isArray(d.themes) || d.themes.length < 1) err(at, 'themes 至少 1 项');
  else for (const t of d.themes) if (!themeIds.has(t)) err(at, `theme「${t}」未在 themes.json 定义`);
  if (typeof d.summary !== 'string' || d.summary.length < 40 || d.summary.length > 120) err(at, `summary 长度须 40–120 字（现 ${d.summary ? d.summary.length : 0}）`);
  if (!Array.isArray(d.highlights) || d.highlights.length < 2 || d.highlights.length > 6) err(at, 'highlights 须 2–6 条');
  if (!Array.isArray(d.bestSeasons) || d.bestSeasons.length < 1) err(at, 'bestSeasons 至少 1 项');
  else for (const s of d.bestSeasons) if (!seasonIds.has(s)) err(at, `season「${s}」未定义`);
  const sd = d.suggestedDays || {};
  if (typeof sd.min !== 'number' || typeof sd.max !== 'number' || sd.min < 0.5 || sd.max < sd.min) err(at, 'suggestedDays 须 min>=0.5 且 max>=min');
  if (!Array.isArray(d.activities) || d.activities.length < 1) err(at, 'activities 至少 1 项');
  if (typeof d.transportNotes !== 'string' || !d.transportNotes) err(at, 'transportNotes 为空');
  if (d.adcode != null && !/^[0-9]{6}$/.test(d.adcode)) err(at, 'adcode 须为 6 位数字');

  if (!Array.isArray(d.images)) err(at, 'images 须为数组');
  else {
    if (d.status === 'published' && d.images.length < 1) err(at, 'published 必须至少 1 张图片');
    for (const img of d.images) {
      for (const k of ['src', 'thumb', 'alt', 'credit', 'license', 'sourceUrl']) if (!img[k]) err(at, `图片缺少 ${k}`);
      if (img.src && !existsSync(join(root, img.src))) err(at, `图片文件不存在: ${img.src}`);
      if (img.thumb && !existsSync(join(root, img.thumb))) err(at, `缩略图文件不存在: ${img.thumb}`);
      if (img.isIllustration) warn(at, '图片为示意图，页面必须明示');
    }
  }
  const src = d.source || {};
  if (!src.name || !src.url || !/^https:\/\//.test(src.url || '')) err(at, 'source.name 与 https source.url 必填');
  if (!isDate(src.retrievedAt)) err(at, 'source.retrievedAt 日期非法');
  if (!isDate(d.verifiedAt)) err(at, 'verifiedAt 日期非法');
  else if (Date.now() - Date.parse(d.verifiedAt + 'T00:00:00Z') > 366 * 86400000) warn(at, 'verifiedAt 已超过 12 个月，需重新核验');
  if (!['draft', 'published', 'hidden'].includes(d.status)) err(at, `status「${d.status}」非法`);
  if (d.status === 'published' && d.verificationNote) warn(at, 'published 仍带 verificationNote，请确认待核验项已清零');

  const banned = ['ticketPrice', 'price', 'openingHours', 'weather', 'currentWeather', 'forecast'];
  for (const k of banned) if (k in d) err(at, `禁止字段 ${k}：票价/开放时间/实时天气不得写入静态数据`);
}

const destDir = join(root, 'data/destinations');
const files = readdirSync(destDir).filter(f => f.endsWith('.json')).sort();
let total = 0, published = 0;
for (const f of files) {
  let list;
  try { list = readJson('data/destinations/' + f); }
  catch (e) { err(f, 'JSON 格式不合法: ' + e.message); continue; }
  if (!Array.isArray(list)) { err(f, '文件顶层须为数组'); continue; }
  for (const d of list) { total++; if (d && d.status === 'published') published++; validateDestination(d, f); }
}

if (process.argv.includes('--check-index')) {
  const index = readJson('data/destinations-index.json');
  if (index.length !== published) err('index', `index 条数 ${index.length} != published 条数 ${published}`);
  const idxIds = new Set(index.map(x => x.id));
  for (const id of seenIds.keys()) { /* drafts/hidden 不要求进 index */ }
  for (const entry of index) if (!seenIds.has(entry.id)) err('index', `index 中 ${entry.id} 在数据文件里不存在`);
}

for (const w of warnings) console.log('WARN  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(`校验完成：共 ${total} 条（published ${published}），${errors.length} 个错误，${warnings.length} 个警告`);
process.exit(errors.length ? 1 : 0);
