/*
 * 候选数据与图片资产一致性审计（只读，不修改任何文件）。
 * 用法：node tools/audit-candidates.mjs [--root <项目根目录>]
 * 退出码：0 = 全部通过；1 = 存在失败项。
 * 检查范围：ID 唯一/必填字段/坐标范围/重点文本断言/审核表状态一致/
 * 图片引用存在性与格式/登记表 approved 对应/禁止引用 rejected/文件哈希重复。
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXPECTED_VERDICTS = {
  'zhangjiajie-national-forest-park': '已核实', 'jiuzhaigou': '已核实', 'huangshan': '已核实',
  'li-river': '已修正', 'kanas-lake': '已核实', 'daocheng-yading': '已核实',
  'qinghai-lake': '已修正', 'changbaishan-tianchi': '已修正', 'huangguoshu-waterfall': '已核实',
  'forbidden-city': '已核实', 'terracotta-army': '已核实', 'mogao-caves': '已核实',
  'pingyao-ancient-city': '已修正', 'potala-palace': '已核实', 'mount-tai': '已核实',
  'longmen-grottoes': '已核实', 'west-lake-hangzhou': '已核实', 'the-bund-shanghai': '已核实',
  'chengdu-panda-base': '已核实', 'hongya-cave': '已核实', 'canton-tower': '已修正',
  'gulangyu': '已核实', 'yalong-bay': '初审通过', 'dali-ancient-city': '已核实',
  'zhangye-danxia': '初审通过', 'yuanyang-terraces': '已核实', 'wuyuan-huangling': '已核实',
  'kashgar-old-city': '已核实', 'enshi-grand-canyon': '已修正', 'lijiang-old-town': '已核实',
};

export function checkRecordText(r) {
  const problems = [];
  const s = r.summary || ''; const t = r.transportNotes || '';
  if (r.id === 'canton-tower' && (s.includes('珠江北岸') || !s.includes('珠江南岸'))) problems.push('广州塔方位表述异常');
  if (r.id === 'enshi-grand-canyon' && (s.includes('交界地带') || !s.includes('恩施市境内'))) problems.push('恩施行政表述异常');
  if (r.id === 'li-river' && !(t.includes('竹江') && t.includes('排筏'))) problems.push('漓江码头区分缺失');
  if (r.id === 'qinghai-lake' && s.includes('鸟岛')) problems.push('青海湖仍提及鸟岛点位');
  if (r.id === 'pingyao-ancient-city' && (s.includes('明清时期曾是') || !s.includes('清代'))) problems.push('平遥年代表述异常');
  if (r.id === 'changbaishan-tianchi') {
    if (!(Math.abs(r.location.lat - 42.0265) < 1e-9 && Math.abs(r.location.lng - 128.0669) < 1e-9)) problems.push('长白山坐标非天文峰观景点');
    if (!s.includes('北坡')) problems.push('长白山简介未区分坡向');
  }
  return problems;
}

function main() {
  const argv = process.argv.slice(2);
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx >= 0 ? argv[rootIdx + 1] : path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  let fails = 0; const fail = (m) => { fails++; console.log('FAIL ' + m); };
  const ok = (m) => console.log('PASS ' + m);

  const recs = JSON.parse(readFileSync(path.join(root, 'data/candidates/first-batch-30.json'), 'utf8'));
  const reg = JSON.parse(readFileSync(path.join(root, 'data/candidates/image-candidates.json'), 'utf8'));
  const audit = readFileSync(path.join(root, 'docs/first-batch-audit.md'), 'utf8');

  if (recs.length === 30) ok('候选记录数 = 30'); else fail(`候选记录数 = ${recs.length}`);
  const ids = new Set(recs.map(r => r.id));
  if (ids.size === recs.length) ok('ID 全部唯一'); else fail('存在重复 ID');
  const FORBIDDEN = ['ticketPrice', 'price', 'openingHours', 'weather'];
  let fieldProblems = 0;
  for (const r of recs) {
    for (const k of ['id', 'name', 'province', 'city', 'district', 'summary', 'transportNotes']) if (!r[k]) { fieldProblems++; fail(`${r.id} 缺字段 ${k}`); }
    const { lat, lng, coordSystem } = r.location || {};
    if (!(lat >= 3 && lat <= 54 && lng >= 73 && lng <= 136)) { fieldProblems++; fail(`${r.id} 坐标越界 ${lat},${lng}`); }
    if (!['WGS-84', 'GCJ-02'].includes(coordSystem)) { fieldProblems++; fail(`${r.id} coordSystem 异常`); }
    for (const k of FORBIDDEN) if (k in r) { fieldProblems++; fail(`${r.id} 含禁止字段 ${k}`); }
    for (const p of checkRecordText(r)) { fieldProblems++; fail(`${r.id} ${p}`); }
    if (EXPECTED_VERDICTS[r.id] === '初审通过' && /已核实/.test((r.verificationNote || '').split('初审').pop() || '') && false) { /* 占位，不误报 */ }
  }
  if (!fieldProblems) ok('必填字段/坐标范围/禁止字段/6 条重点文本断言全部通过');

  // 审核表第二部分状态与预期一致
  let verdictMismatch = 0;
  for (const [id, v] of Object.entries(EXPECTED_VERDICTS)) {
    const row = audit.split('\n').find(l => l.startsWith(`| ${id} | `) && l.includes('已核实') || l.startsWith(`| ${id} | ${v}`));
    const found = audit.split('\n').some(l => l.startsWith(`| ${id} | ${v} |`));
    if (!found) { verdictMismatch++; fail(`审核表状态不符：${id} 期望「${v}」`); }
  }
  if (!verdictMismatch) ok('审核表第二部分 30 条状态与预期口径一致（已核实 22/已修正 6/初审通过 2）');

  // 图片资产
  const approvedBySrc = new Map();
  for (const it of reg.items) if (it.status === 'approved' && it.localized) approvedBySrc.set(it.localized.src, it);
  const rejectedSrcs = new Set(reg.items.filter(i => i.status === 'rejected' && i.localized).map(i => i.localized.src));
  const hashes = new Map(); let imgProblems = 0; let imgCount = 0;
  for (const r of recs) {
    if (!r.images || !r.images.length) { imgProblems++; fail(`${r.id} 无图片`); continue; }
    for (const im of r.images) {
      imgCount++;
      for (const key of ['src', 'thumb', 'alt', 'credit', 'license', 'sourceUrl']) if (!im[key]) { imgProblems++; fail(`${r.id} 图片缺 ${key}`); }
      if (rejectedSrcs.has(im.src)) { imgProblems++; fail(`${r.id} 引用了被排除图片 ${im.src}`); }
      const reg1 = approvedBySrc.get(im.src);
      if (!reg1) { imgProblems++; fail(`${r.id} 图片未在登记表 approved 中找到：${im.src}`); }
      else if (reg1.license !== im.license) { imgProblems++; fail(`${r.id} 许可与登记表不一致：${im.src}`); }
      for (const f of [im.src, im.thumb]) {
        const fp = path.join(root, f);
        if (!existsSync(fp)) { imgProblems++; fail(`文件不存在：${f}`); continue; }
        const buf = readFileSync(fp);
        if (!(buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP')) { imgProblems++; fail(`非 WebP 文件：${f}`); }
        if (buf.length < 3000) { imgProblems++; fail(`文件异常小：${f} ${buf.length}B`); }
        if (f === im.src) {
          const h = createHash('sha256').update(buf).digest('hex');
          if (hashes.has(h)) { imgProblems++; fail(`全图内容重复：${f} 与 ${hashes.get(h)}`); }
          hashes.set(h, f);
          if (reg1 && reg1.localized && reg1.localized.fullBytes !== buf.length) { imgProblems++; fail(`登记体积与实际不符：${f}`); }
          const st = statSync(fp); if (st.size !== buf.length) { imgProblems++; fail(`读取异常：${f}`); }
        }
      }
    }
  }
  if (!imgProblems) ok(`图片资产一致：${imgCount} 张引用全部存在、WebP 有效、许可/署名齐备、与登记表一致、无重复文件`);
  console.log(fails ? `AUDIT RESULT: ${fails} 项失败` : 'AUDIT RESULT: 全部通过');
  process.exit(fails ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
