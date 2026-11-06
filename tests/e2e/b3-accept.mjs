/* B3 发现页灵感中心验收：四视口 */
import { firefox } from 'playwright-core';

const BASE = 'http://127.0.0.1:8130/';
const SHOTS = '/home/hatch/workspace/cta_b3/shots/';
const VIEWPORTS = [
  { name: '1440', w: 1440, h: 900 },
  { name: '1280', w: 1280, h: 800 },
  { name: '390', w: 390, h: 844 },
  { name: '360', w: 360, h: 740 },
];

(async () => {
  const browser = await firefox.launch();
  const results = [];
  const errors = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${vp.name}] ${m.text().slice(0, 120)}`); });
    page.on('pageerror', e => errors.push(`[${vp.name}] PAGEERROR: ${String(e).slice(0, 120)}`));

    await page.goto(BASE + '#/discover', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.disc-mod', { timeout: 15000 });
    await page.waitForTimeout(800);

    // 1. 模块清单
    const mods = await page.locator('.disc-mod').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
    results.push(`[${vp.name}] 1.模块: ${mods.join(' / ')}`);

    // 2. M1 今日精选：band 标题 + 换一个
    const m1 = await page.locator('.disc-mod[aria-label="今日精选"] .disc-band-title').textContent();
    results.push(`[${vp.name}] 2.M1今日精选: "${(m1 || '').trim()}" (期望 泰山)`);
    await page.locator('[data-next-featured]').click();
    await page.waitForTimeout(600);
    const m1b = await page.locator('.disc-mod[aria-label="今日精选"] .disc-band-title').textContent();
    results.push(`[${vp.name}] 2b.换一个精选: "${(m1b || '').trim()}" ${m1b !== m1 ? 'OK 变化' : 'FAIL 未变化'}`);

    // 3. M2 当季旅行：4 张 + 秋季标题
    const m2head = await page.locator('.disc-mod[aria-label="当季旅行"] h3').textContent();
    const m2names = await page.locator('.season-card-name').allTextContents();
    results.push(`[${vp.name}] 3.M2: "${(m2head || '').trim()}" [${m2names.map(s => s.trim()).join(', ')}]`);

    // 4. M3 主题探索：9 张，无冰雪
    const m3names = await page.locator('.theme-chip-card-name').allTextContents();
    const m3counts = await page.locator('.theme-chip-card-count').allTextContents();
    results.push(`[${vp.name}] 4.M3: ${m3names.length}张 [${m3names.map(s => s.trim()).join(', ')}] ${m3names.some(s => s.includes('冰雪')) ? 'FAIL 含冰雪' : 'OK 无冰雪'}`);

    // 5. M4 小众：4 张
    const m4names = await page.locator('.gem-card-name').allTextContents();
    results.push(`[${vp.name}] 5.M4小众: [${m4names.map(s => s.trim()).join(', ')}]`);

    // 6. M5 新闻：5 条真实资讯，按发布时间倒序，首条为 2026-11-05 央视网
    const m5 = await page.locator('.disc-mod[aria-label="旅行新鲜事"]').count();
    const m5items = await page.locator('.disc-news-item').count();
    const m5first = m5items ? await page.locator('.disc-news-title').first().textContent() : '';
    const m5firstDate = m5items ? await page.locator('.disc-news-date').first().textContent() : '';
    const m5href = m5items ? await page.locator('.disc-news-title').first().getAttribute('href') : '';
    const m5rel = await page.locator('.disc-news-meta a[href^="#/dest/"]').count();
    results.push(`[${vp.name}] 6.M5新闻: 模块=${m5} 条数=${m5items} 首条="${(m5first || '').trim().slice(0, 20)}" 日期="${(m5firstDate || '').trim()}" 链接=${m5href && m5href.startsWith('https://news.cctv.cn') ? 'OK' : 'FAIL ' + m5href} 关联目的地链接=${m5rel}`);

    // 7. M6 趣味：4 张
    const m6q = await page.locator('.fun-card-q').allTextContents();
    results.push(`[${vp.name}] 7.M6趣味: ${m6q.length}张`);

    // 8. M7 全部：42 张卡
    const m7count = await page.locator('.disc-mod[aria-label="全部目的地"] .dest-card').count();
    results.push(`[${vp.name}] 8.M7全部: ${m7count}张 ${m7count === 42 ? 'OK' : 'FAIL'}`);

    // 9. 横向溢出
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push(`[${vp.name}] 9.横向溢出: ${ow}px ${ow === 0 ? 'OK' : 'FAIL'}`);

    // 10. 主题卡点击跳转（第1张主题卡）
    await page.locator('.theme-chip-card').first().click();
    await page.waitForTimeout(1200);
    const url = page.url();
    const resCount = await page.locator('.card-grid .dest-card').count();
    results.push(`[${vp.name}] 10.主题卡跳转: ${url.includes('theme=') ? 'OK ' + url.split('#')[1] : 'FAIL ' + url} 结果${resCount}条`);

    // 11. 回到无筛选灵感视图：清除筛选
    await page.locator('[data-clear-filters]').first().click().catch(() => {});
    await page.waitForTimeout(1000);
    const modsBack = await page.locator('.disc-mod').count();
    results.push(`[${vp.name}] 11.清除筛选回灵感视图: 模块数=${modsBack} ${modsBack >= 6 ? 'OK' : 'FAIL'}`);

    // 截图
    await page.goto(BASE + '#/discover', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.disc-mod', { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}b3-discover-top-${vp.name}.png` });
    await page.locator('.disc-mod[aria-label="当季旅行"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}b3-discover-season-${vp.name}.png` });
    await page.locator('.disc-mod[aria-label="小众目的地"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}b3-discover-gems-${vp.name}.png` });

    // 12. B1 轮播不受影响
    await page.goto(BASE + '#/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.car-slide.on', { timeout: 15000 });
    const heroTitle = await page.locator('.car-slide.on .car-title').textContent();
    const themeCards = await page.locator('.theme-card').count();
    results.push(`[${vp.name}] 12.B1轮播: "${(heroTitle || '').trim()}" 主题卡${themeCards}张`);

    await ctx.close();
  }

  await browser.close();
  console.log('=== B3 测试结果 ===');
  results.forEach(r => console.log(r));
  console.log('=== 控制台错误 ===');
  console.log(errors.length ? errors.join('\n') : '(无)');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
