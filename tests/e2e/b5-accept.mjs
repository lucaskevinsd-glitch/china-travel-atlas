/* B5 目的地关联推荐验收：详情页三层推荐区（M1 附近 / M2 相似 / M3 延伸）+ 四视口 */
import { firefox } from 'playwright-core';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:8130/';
const SHOTS = '/home/hatch/workspace/cta_b5/shots/';
const VIEWPORTS = [
  { name: '1440', w: 1440, h: 900 },
  { name: '1280', w: 1280, h: 800 },
  { name: '390', w: 390, h: 844 },
  { name: '360', w: 360, h: 740 },
];
fs.mkdirSync(SHOTS, { recursive: true });

async function loadDetail(page, id) {
  await page.goto(BASE + '#/dest/' + id, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('article.detail h2', { timeout: 15000 });
  await page.waitForTimeout(800);
}

async function recState(page) {
  return await page.evaluate(() => {
    const sec = document.querySelector('#rec-section');
    if (!sec || sec.hidden) return { shown: false };
    const mods = {};
    for (const [key, sel] of [['nearby', '[data-rec-nearby]'], ['similar', '[data-rec-similar]'], ['extended', '[data-rec-extended]']]) {
      const box = sec.querySelector(sel);
      if (!box || box.hidden) { mods[key] = { shown: false, cards: [] }; continue; }
      mods[key] = {
        shown: true,
        cards: [...box.querySelectorAll('.dest-card')].map(c => ({
          href: c.querySelector('.card-link')?.getAttribute('href') || '',
          name: c.querySelector('h3')?.textContent?.trim() || '',
          note: c.querySelector('.rec-note')?.textContent?.trim() || '',
        })),
      };
    }
    return { shown: true, mods };
  });
}

(async () => {
  const browser = await firefox.launch();
  const results = [];
  const errors = [];
  function check(name, ok, extra = '') { results.push(ok); console.log((ok ? 'OK ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); }

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${vp.name}] ${m.text().slice(0, 120)}`); });
    page.on('pageerror', e => errors.push(`[${vp.name}] PAGEERROR: ${String(e).slice(0, 120)}`));
    const tag = `[${vp.name}]`;

    // 1. 西湖：M1 首张为乌镇 65km，理由含直线距离
    await loadDetail(page, 'west-lake-hangzhou');
    let st = await recState(page);
    check(tag + ' 西湖推荐区显示', st.shown);
    const xiM1 = st.mods.nearby.cards;
    check(tag + ' 西湖 M1 首张为乌镇', xiM1.length > 0 && xiM1[0].href.includes('wuzhen'), xiM1[0]?.name + ' ' + xiM1[0]?.note);
    check(tag + ' 西湖 M1 理由为直线距离约 65 公里', (xiM1[0]?.note || '').includes('直线距离约 65 公里'), xiM1[0]?.note);
    check(tag + ' 西湖三层均有内容', st.mods.nearby.shown && st.mods.similar.shown && st.mods.extended.shown);

    // 2. 宏村：M1 首张为黄山 22km
    await loadDetail(page, 'hongcun');
    st = await recState(page);
    const hcM1 = st.mods.nearby.cards;
    check(tag + ' 宏村 M1 首张为黄山', hcM1.length > 0 && hcM1[0].href.includes('huangshan'), hcM1[0]?.name + ' ' + hcM1[0]?.note);
    check(tag + ' 宏村 M1 理由为直线距离约 22 公里', (hcM1[0]?.note || '').includes('直线距离约 22 公里'), hcM1[0]?.note);

    // 3. 成都熊猫基地：M1 首张为峨眉山
    await loadDetail(page, 'chengdu-panda-base');
    st = await recState(page);
    check(tag + ' 成都 M1 首张为峨眉山', st.mods.nearby.cards.length > 0 && st.mods.nearby.cards[0].href.includes('mount-emei'), st.mods.nearby.cards[0]?.name);

    // 4. 九寨沟：M2 含漓江，理由具体
    await loadDetail(page, 'jiuzhaigou');
    st = await recState(page);
    const jzM2 = st.mods.similar.cards;
    check(tag + ' 九寨沟 M2 含漓江', jzM2.some(c => c.href.includes('li-river')), jzM2.map(c => c.name).join(','));
    check(tag + ' 九寨沟 M2 理由含共同主题', jzM2.length > 0 && jzM2[0].note.includes('共同主题'), jzM2[0]?.note);

    // 5. 乌镇：M2 含宏村/西江，不含洪崖洞
    await loadDetail(page, 'wuzhen');
    st = await recState(page);
    const wzM2 = st.mods.similar.cards.map(c => c.href);
    check(tag + ' 乌镇 M2 含宏村与西江', wzM2.some(h => h.includes('hongcun')) && wzM2.some(h => h.includes('xijiang-miao-village')), wzM2.join(','));
    check(tag + ' 乌镇 M2 不含洪崖洞', !wzM2.some(h => h.includes('hongya-cave')));

    // 6. 亚龙湾：M1 隐藏（300km 内无邻居），M2 仅 2 张
    await loadDetail(page, 'yalong-bay');
    st = await recState(page);
    check(tag + ' 亚龙湾 M1 隐藏不凑数', !st.mods.nearby.shown);
    check(tag + ' 亚龙湾 M2 仅 2 张（鼓浪屿/青岛）', st.mods.similar.cards.length === 2, String(st.mods.similar.cards.length));

    // 7. 当前目的地不推荐自己（西湖页）
    await loadDetail(page, 'west-lake-hangzhou');
    st = await recState(page);
    const allHrefs = [...st.mods.nearby.cards, ...st.mods.similar.cards, ...st.mods.extended.cards].map(c => c.href);
    check(tag + ' 西湖页推荐不含自身', !allHrefs.some(h => h.includes('west-lake-hangzhou')), allHrefs.join(','));

    // 8. 三层不重复（西湖页）
    check(tag + ' 西湖页三层无重复', new Set(allHrefs).size === allHrefs.length, allHrefs.join(','));

    // 9. 点击推荐卡片进入正确详情
    await page.click('[data-rec-nearby] .dest-card .card-link >> nth=0');
    await page.waitForTimeout(700);
    const h2 = await page.locator('article.detail h2').first().textContent().catch(() => '');
    check(tag + ' 点击 M1 首张进入乌镇详情', (h2 || '').includes('乌镇'), h2);

    // 10. 不同目的地推荐不同（西湖 vs 九寨沟）
    await loadDetail(page, 'west-lake-hangzhou');
    const xiAll = await page.evaluate(() => [...document.querySelectorAll('#rec-section .dest-card .card-link')].map(a => a.getAttribute('href')).join(','));
    await loadDetail(page, 'jiuzhaigou');
    const jzAll = await page.evaluate(() => [...document.querySelectorAll('#rec-section .dest-card .card-link')].map(a => a.getAttribute('href')).join(','));
    check(tag + ' 西湖与九寨沟推荐不同', xiAll !== jzAll);

    // 11. 横向溢出
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(tag + ' 无横向溢出', overflow === 0, 'overflow=' + overflow);

    await page.screenshot({ path: SHOTS + 'b5-detail-' + vp.name + '.png', fullPage: false });
    await ctx.close();
  }

  console.log('B5 SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed; 控制台错误 ' + errors.length + (errors.length ? ' — ' + errors.join(' | ').slice(0, 300) : ''));
  await browser.close();
  process.exit(results.every(Boolean) && errors.length === 0 ? 0 : 1);
})();
