/* B4 规划器地理距离验收：10 项案例 + 四视口 */
import { firefox } from 'playwright-core';

const BASE = 'http://127.0.0.1:8130/';
const SHOTS = '/home/hatch/workspace/cta_b4/shots/';
const VIEWPORTS = [
  { name: '1440', w: 1440, h: 900 },
  { name: '1280', w: 1280, h: 800 },
  { name: '390', w: 390, h: 844 },
  { name: '360', w: 360, h: 740 },
];

const NAMES = {
  'potala-palace': '布达拉宫', 'chengdu-panda-base': '成都大熊猫繁育研究基地',
  'hongcun': '宏村', 'huangshan': '黄山风景区', 'wuyuan-huangling': '婺源篁岭',
  'mount-emei': '峨眉山', 'li-river': '漓江', 'zhangjiajie-national-forest-park': '张家界国家森林公园',
  'forbidden-city': '故宫博物院', 'the-bund-shanghai': '外滩', 'shenyang-imperial-palace': '沈阳故宫',
  'jiuzhaigou': '九寨沟', 'harbin-central-street': '哈尔滨中央大街', 'yalong-bay': '亚龙湾',
  'no-such-place': '不存在的地方',
};

function seedPlan(ids, sameDate = false) {
  const itinerary = ids.map((id, i) => ({
    date: sameDate ? '2026-11-01' : '2026-11-0' + (i + 1),
    destinationId: id,
    destinationName: NAMES[id] || id,
    activities: [],
  }));
  const draft = {
    savedAt: '2026-11-05T00:00:00.000Z', from: '', edited: false,
    plan: { ok: true, startDate: '2026-11-01', days: itinerary.length, people: null, budgetTier: null, itinerary, totalDays: itinerary.length },
  };
  return `localStorage.setItem('cta.store.v1', JSON.stringify({schema:1, favorites:[], planDraft:${JSON.stringify(draft)}, discover:null}));`;
}

async function loadPlanner(page, ids, sameDate = false) {
  /* 同 hash 的 goto 不重建文档，addInitScript 不会重跑；改为在现页写 localStorage 后强制 reload，
     再核对首日目的地名， stale 加载直接报错。 */
  await page.goto(BASE + '#/planner', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(seedPlan(ids, sameDate));
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#plan-list, #plan-result', { timeout: 15000 });
  await page.waitForTimeout(500);
  const first = await page.locator('.plan-day .plan-name').first().textContent().catch(() => '');
  if ((first || '').trim() !== NAMES[ids[0]]) throw new Error('种子未生效：首日=' + first + '，期望=' + NAMES[ids[0]]);
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

    // 案例 1：拉萨→成都相邻两天（B0 案例）应为警告
    await loadPlanner(page, ['potala-palace', 'chengdu-panda-base']);
    let hints = await page.locator('.geo-hint').allTextContents();
    results.push(`[${vp.name}] 1.拉萨→成都: ${hints.length}条提示 ${hints.some(h => h.includes('1256')) ? '含1256km OK' : 'FAIL 无距离'} ${hints.some(h => h.includes('注意')) ? '级别=注意 OK' : 'FAIL 级别'}`);

    // 案例 2：同一城市多景点无误报
    await loadPlanner(page, ['hongcun', 'huangshan']);
    results.push(`[${vp.name}] 2.同城(宏村→黄山): 提示=${await page.locator('.geo-hint').count()} ${await page.locator('.geo-hint').count() === 0 ? 'OK 无误报' : 'FAIL'}`);

    // 案例 3：同一省份邻近景点无误报
    await loadPlanner(page, ['chengdu-panda-base', 'mount-emei']);
    results.push(`[${vp.name}] 3.同省近(成都→峨眉): 提示=${await page.locator('.geo-hint').count()} ${await page.locator('.geo-hint').count() === 0 ? 'OK 无误报' : 'FAIL'}`);

    // 案例 4：相邻省份但实际较远（漓江→张家界 491km，应为提示级）
    await loadPlanner(page, ['li-river', 'zhangjiajie-national-forest-park']);
    hints = await page.locator('.geo-hint').allTextContents();
    results.push(`[${vp.name}] 4.邻省远(漓江→张家界): ${hints.length}条 ${hints.some(h => h.includes('491')) ? '含491km OK' : 'FAIL'} ${hints.some(h => h.includes('提示')) ? '级别=提示 OK' : 'FAIL 级别'}`);

    // 案例 5：同一天多个远距离景点（同日北京+上海，应为严重）
    await loadPlanner(page, ['forbidden-city', 'the-bund-shanghai'], true);
    hints = await page.locator('.geo-hint').allTextContents();
    results.push(`[${vp.name}] 5.同日远(北京+上海): ${hints.length}条 ${hints.some(h => h.includes('严重')) ? '级别=严重 OK' : 'FAIL 级别'}`);

    // 案例 6：缺少坐标的目的地
    await loadPlanner(page, ['forbidden-city', 'no-such-place']);
    hints = await page.locator('.geo-hint').allTextContents();
    results.push(`[${vp.name}] 6.缺坐标: ${hints.length}条 ${hints.some(h => h.includes('暂无坐标')) ? 'OK 标记无法计算' : 'FAIL'}`);

    // 案例 7：用户主动接受跨区域行程（点“知道了”后提示消失、行程不变）
    await loadPlanner(page, ['potala-palace', 'chengdu-panda-base']);
    const before = await page.locator('.plan-day .plan-name').allTextContents();
    await page.locator('[data-act="dismiss-geo"]').first().click();
    await page.waitForTimeout(400);
    const after = await page.locator('.plan-day .plan-name').allTextContents();
    results.push(`[${vp.name}] 7.接受跨区: 提示=${await page.locator('.geo-hint').count()} 行程=${after.join('→')} ${after.join() === before.join() && await page.locator('.geo-hint').count() === 0 ? 'OK 提示消失且行程不变' : 'FAIL'}`);

    // 案例 8：手动修改日期后重新计算（下移第1天，绕路提示应消失）
    await loadPlanner(page, ['forbidden-city', 'the-bund-shanghai', 'shenyang-imperial-palace']);
    const detourBefore = await page.locator('.geo-hint').allTextContents();
    const hasDetour = detourBefore.some(h => h.includes('绕路'));
    await page.locator('[data-act="down"][data-i="0"]').click();
    await page.waitForTimeout(500);
    const detourAfter = await page.locator('.geo-hint').allTextContents();
    const orderAfter = await page.locator('.plan-day .plan-name').allTextContents();
    results.push(`[${vp.name}] 8.编辑后重算: 绕路前=${hasDetour} 绕路后=${detourAfter.some(h => h.includes('绕路'))} 顺序=${orderAfter.join('→')} ${hasDetour && !detourAfter.some(h => h.includes('绕路')) ? 'OK 重新计算' : 'FAIL'}`);

    // 案例 9：用户确认重排后正确更新
    await loadPlanner(page, ['jiuzhaigou', 'the-bund-shanghai', 'chengdu-panda-base']);
    const hasPanel = await page.locator('.geo-reorder').count();
    let applied = 'FAIL 无面板';
    if (hasPanel) {
      await page.locator('[data-act="apply-reorder"]').click();
      await page.waitForTimeout(500);
      const order = await page.locator('.plan-day .plan-name').allTextContents();
      const panelAfter = await page.locator('.geo-reorder').count();
      applied = order.join('→') === '九寨沟→成都大熊猫繁育研究基地→外滩' && panelAfter === 0
        ? 'OK 顺序已更新且面板消失' : 'FAIL 顺序=' + order.join('→') + ' 面板=' + panelAfter;
    }
    results.push(`[${vp.name}] 9.确认重排: ${applied}`);

    // 案例 10：正常短途行程不误报
    await loadPlanner(page, ['hongcun', 'huangshan', 'wuyuan-huangling']);
    results.push(`[${vp.name}] 10.短途无误报: 提示=${await page.locator('.geo-hint').count()} 重排面板=${await page.locator('.geo-reorder').count()} ${(await page.locator('.geo-hint').count()) === 0 && (await page.locator('.geo-reorder').count()) === 0 ? 'OK' : 'FAIL'}`);

    // 横向溢出
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push(`[${vp.name}] 溢出: ${ow}px ${ow === 0 ? 'OK' : 'FAIL'}`);

    // 截图：B0 案例
    await loadPlanner(page, ['potala-palace', 'chengdu-panda-base']);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}b4-planner-lhasa-chengdu-${vp.name}.png` });
    // 截图：重排建议
    await loadPlanner(page, ['jiuzhaigou', 'the-bund-shanghai', 'chengdu-panda-base']);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}b4-planner-reorder-${vp.name}.png` });

    // 回归：首页轮播 + 发现页
    await page.goto(BASE + '#/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.car-slide.on', { timeout: 15000 });
    const heroTitle = await page.locator('.car-slide.on .car-title').textContent();
    results.push(`[${vp.name}] 回归首页: "${(heroTitle || '').trim()}"`);
    await page.goto(BASE + '#/discover', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.disc-mod', { timeout: 15000 });
    const mods = await page.locator('.disc-mod').count();
    results.push(`[${vp.name}] 回归发现: 模块=${mods}`);

    await ctx.close();
  }

  await browser.close();
  console.log('=== B4 测试结果 ===');
  results.forEach(r => console.log(r));
  console.log('=== 控制台错误 ===');
  console.log(errors.length ? errors.join('\n') : '(无)');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
