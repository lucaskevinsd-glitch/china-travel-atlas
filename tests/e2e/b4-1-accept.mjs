/* B4.1 生成器地理感知验收：表单生成 + 12 项专项（浏览器部分）+ 四视口回归 */
import { firefox } from 'playwright-core';

const BASE = 'http://127.0.0.1:8130/';
const SHOTS = '/home/hatch/workspace/cta_b41/shots/';
const VIEWPORTS = [
  { name: '1440', w: 1440, h: 900 },
  { name: '1280', w: 1280, h: 800 },
  { name: '390', w: 390, h: 844 },
  { name: '360', w: 360, h: 740 },
];

const dayNames = async page => page.locator('.plan-day .plan-name').allTextContents();
const hintCount = async page => page.locator('.geo-hint').count();

async function genPlan(page, { date = '2026-11-02', days = 3, theme = '', season = '' } = {}) {
  await page.goto(BASE + '#/planner', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#plan-form', { timeout: 15000 });
  await page.fill('#p-date', date);
  await page.fill('#p-days', String(days));
  if (theme) await page.selectOption('#p-theme', theme);
  if (season) await page.selectOption('#p-season', season);
  await page.click('#plan-form button[type="submit"]');
  await page.waitForSelector('#plan-list li', { timeout: 15000 });
  await page.waitForTimeout(400);
}

(async () => {
  const browser = await firefox.launch();
  const results = [];
  const errors = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${vp.name}] ${m.text().slice(0, 120)}`); });
    page.on('pageerror', e => errors.push(`[${vp.name}] PAGEERROR: ${String(e).slice(0, 120)}`));

    // 1.B4 案例：无筛选 3 天，不再是布达拉宫→成都→承德
    await genPlan(page, {});
    let names = await dayNames(page);
    results.push(`[${vp.name}] 1.B4案例: ${names.join('→')} 提示=${await hintCount(page)} ${names.join() === ['杭州西湖', '杭州西湖', '乌镇'].join() && await hintCount(page) === 0 ? 'OK 2939km→65km零提示' : 'FAIL'}`);

    // 10.主题：nature 与 historic 均尊重主题且地理连续
    await genPlan(page, { theme: 'nature' });
    names = await dayNames(page);
    const natOk = await page.evaluate(() => fetch('/data/destinations-index.json').then(r => r.json()).then(idx => {
      const by = {}; idx.forEach(d => { by[d.name] = d; });
      return [...document.querySelectorAll('.plan-day .plan-name')].every(el => (by[el.textContent.trim()] || { themes: [] }).themes.includes('nature'));
    }));
    results.push(`[${vp.name}] 10a.nature: ${names.join('→')} 主题匹配=${natOk} 提示=${await hintCount(page)} ${natOk && await hintCount(page) === 0 ? 'OK' : 'FAIL'}`);
    await genPlan(page, { theme: 'historic' });
    names = await dayNames(page);
    const hisOk = await page.evaluate(() => fetch('/data/destinations-index.json').then(r => r.json()).then(idx => {
      const by = {}; idx.forEach(d => { by[d.name] = d; });
      return [...document.querySelectorAll('.plan-day .plan-name')].every(el => (by[el.textContent.trim()] || { themes: [] }).themes.includes('historic'));
    }));
    results.push(`[${vp.name}] 10b.historic: ${names.join('→')} 主题匹配=${hisOk} 提示=${await hintCount(page)} ${hisOk && await hintCount(page) === 0 ? 'OK' : 'FAIL'}`);

    // 12.重复生成稳定：同一输入两次顺序相同
    await genPlan(page, {});
    const first = await dayNames(page);
    await genPlan(page, {});
    const second = await dayNames(page);
    results.push(`[${vp.name}] 12.重复生成: ${first.join() === second.join() ? 'OK 稳定' : 'FAIL ' + first.join('→') + ' vs ' + second.join('→')}`);

    // 11.用户修改生成草案后，B4 检测仍然正常（中间插入布达拉宫→严重提示出现；删除后提示消失）
    await genPlan(page, {});
    await page.locator('[data-act="insert"][data-i="1"]').click();
    await page.waitForTimeout(300);
    await page.selectOption('[data-insert-select="1"]', 'potala-palace');
    await page.locator('[data-act="confirm-insert"][data-i="1"]').click();
    await page.waitForTimeout(500);
    names = await dayNames(page);
    const severeAfterInsert = await page.locator('.geo-hint.geo-severe').count();
    await page.locator('[data-act="remove"][data-i="2"]').click();
    await page.waitForTimeout(400);
    const hintsAfterDel = await hintCount(page);
    results.push(`[${vp.name}] 11.编辑后检测: 插入后顺序=${names.join('→')} 严重提示=${severeAfterInsert} 删除后提示=${hintsAfterDel} ${severeAfterInsert >= 1 && hintsAfterDel === 0 ? 'OK 检测随编辑重算' : 'FAIL'}`);

    // 7.用户指定顺序不被覆盖：把乌镇上移后刷新，顺序保持
    await genPlan(page, {});
    await page.locator('[data-act="up"][data-i="2"]').click();
    await page.waitForTimeout(400);
    const edited = await dayNames(page);
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#plan-list li', { timeout: 15000 });
    const reloaded = await dayNames(page);
    results.push(`[${vp.name}] 7.手动顺序持久: 编辑后=${edited.join('→')} 刷新后=${reloaded.join('→')} ${edited.join() === reloaded.join() && edited[1] === '乌镇' ? 'OK' : 'FAIL'}`);

    // 6.用户指定的远距离目的地：插入布达拉宫，保留且 B4 给出提示
    await genPlan(page, {});
    await page.selectOption('#add-end-select', 'potala-palace');
    await page.locator('[data-act="add-end"]').click();
    await page.waitForTimeout(400);
    names = await dayNames(page);
    const farHints = await page.locator('.geo-hint').allTextContents();
    results.push(`[${vp.name}] 6.远距离插入: 含布达拉宫=${names.includes('布达拉宫')} 提示=${farHints.length} ${names.includes('布达拉宫') && farHints.some(h => h.includes('布达拉宫')) ? 'OK 保留且提示' : 'FAIL'}`);

    // 回归：保存提示、删除一天、删空
    await genPlan(page, {});
    const saved = await page.locator('#plan-status').textContent().catch(() => '');
    await page.locator('[data-act="remove"][data-i="2"]').click();
    await page.waitForTimeout(400);
    const afterDel = await dayNames(page);
    results.push(`[${vp.name}] 回归保存/删除: 保存="${(saved || '').trim()}" 删后=${afterDel.length}天 ${(saved || '').includes('已保存') && afterDel.length === 2 ? 'OK' : 'FAIL'}`);
    await page.locator('[data-act="remove"][data-i="0"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-act="remove"][data-i="0"]').click();
    await page.waitForTimeout(400);
    const emptyState = await page.locator('#plan-result').textContent();
    results.push(`[${vp.name}] 回归删空: ${emptyState.includes('还没有行程安排') ? 'OK 空态引导' : 'FAIL'}`);

    // 回归：B4 重排确认（用 localStorage 预置打乱行程）
    await page.goto(BASE + '#/planner', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      const it = [['jiuzhaigou', '九寨沟'], ['the-bund-shanghai', '外滩'], ['chengdu-panda-base', '成都大熊猫繁育研究基地']].map(([id, name], i) => ({ date: '2026-11-0' + (i + 1), destinationId: id, destinationName: name, activities: [] }));
      const draft = { savedAt: '2026-11-06T00:00:00.000Z', from: '', plan: { ok: true, startDate: '2026-11-01', days: 3, people: null, budgetTier: null, itinerary: it, totalDays: 3 } };
      localStorage.setItem('cta.store.v1', JSON.stringify({ schema: 1, favorites: [], planDraft: draft, discover: null }));
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.geo-reorder', { timeout: 15000 });
    await page.locator('[data-act="apply-reorder"]').click();
    await page.waitForTimeout(500);
    names = await dayNames(page);
    results.push(`[${vp.name}] 回归B4重排: ${names.join('→')} ${names.join() === ['九寨沟', '成都大熊猫繁育研究基地', '外滩'].join() ? 'OK' : 'FAIL'}`);

    // 横向溢出
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push(`[${vp.name}] 溢出: ${ow}px ${ow === 0 ? 'OK' : 'FAIL'}`);

    // 截图：生成后的行程页
    await genPlan(page, {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}b41-planner-generated-${vp.name}.png` });

    // 回归：首页、发现页、主题卡、详情页
    await page.goto(BASE + '#/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.car-slide.on', { timeout: 15000 });
    const heroTitle = await page.locator('.car-slide.on .car-title').textContent();
    results.push(`[${vp.name}] 回归首页: "${(heroTitle || '').trim()}"`);
    await page.goto(BASE + '#/discover', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.disc-mod', { timeout: 15000 });
    results.push(`[${vp.name}] 回归发现: 模块=${await page.locator('.disc-mod').count()}`);
    await page.locator('.theme-chip-card').first().click();
    await page.waitForTimeout(800);
    results.push(`[${vp.name}] 回归主题卡: URL=${page.url().split('#')[1] || ''}`);
    await page.goto(BASE + '#/dest/huangshan', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('h2', { timeout: 15000 });
    results.push(`[${vp.name}] 回归详情: ${await page.locator('h2').first().textContent().catch(() => '')}`);

    await ctx.close();
  }

  await browser.close();
  console.log('=== B4.1 测试结果 ===');
  results.forEach(r => console.log(r));
  console.log('=== 控制台错误 ===');
  console.log(errors.length ? errors.join('\n') : '(无)');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
