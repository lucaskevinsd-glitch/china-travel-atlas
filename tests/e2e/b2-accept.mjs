/* B2 主题卡片与发现页首屏验收：四视口 */
import { firefox } from 'playwright-core';

const BASE = 'http://127.0.0.1:8130/';
const SHOTS = '/home/hatch/workspace/cta_b2/shots/';
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

    // ---- 首页主题卡 ----
    await page.goto(BASE + '#/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.theme-card', { timeout: 15000 });
    await page.waitForTimeout(800);

    // 1. 四张卡完整展示
    const cards = await page.locator('.theme-card').count();
    const titles = await page.locator('.theme-card .theme-t b').allTextContents();
    results.push(`[${vp.name}] 1.主题卡: ${cards}张 [${titles.map(t => t.trim()).join(' / ')}]`);

    // 2. 每张卡图片与文字匹配（取 img src + alt）
    const imgs = await page.locator('.theme-card img').evaluateAll(els => els.map(e => ({ src: (e.getAttribute('src') || '').split('/').pop(), alt: e.getAttribute('alt') || '', nw: e.naturalWidth })));
    results.push(`[${vp.name}] 2.卡片图片: ${imgs.map(i => i.src + '(' + i.nw + 'px)').join(', ')}`);

    // 3. 无重复图片
    const srcs = imgs.map(i => i.src);
    const dup = srcs.length !== new Set(srcs).size;
    results.push(`[${vp.name}] 3.图片无重复: ${dup ? 'FAIL 有重复' : 'OK'}`);

    // 4. 无"城市漫游"标签
    const hasCity = titles.some(t => t.includes('城市漫游'));
    results.push(`[${vp.name}] 4.无城市漫游错配: ${hasCity ? 'FAIL 仍存在' : 'OK'}`);

    // 5. 横向溢出
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push(`[${vp.name}] 5.首页横向溢出: ${ow}px ${ow === 0 ? 'OK' : 'FAIL'}`);

    // 截图：主题卡区域
    await page.locator('.theme-grid').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}b2-themes-${vp.name}.png` });

    // 6. 点击第3张卡（古镇古城）跳转正确
    await page.locator('.theme-card').nth(2).click();
    await page.waitForTimeout(1500);
    const url = page.url();
    results.push(`[${vp.name}] 6.古镇卡跳转: ${url.includes('theme=ancient-town') ? 'OK' : 'FAIL ' + url}`);

    // ---- 发现页首屏 ----
    // 7. 首屏 band 有标题层
    const bandCap = await page.locator('.disc-band-cap').count();
    const bandTitle = bandCap ? await page.locator('.disc-band-title').textContent() : null;
    const bandKicker = bandCap ? await page.locator('.disc-band-kicker').textContent() : null;
    results.push(`[${vp.name}] 7.发现页band标题层: cap=${bandCap} kicker="${(bandKicker || '').trim()}" title="${(bandTitle || '').trim()}"`);

    // 8. band 图片加载
    const bandNw = bandCap ? await page.locator('.disc-band img').evaluate(el => el.naturalWidth) : 0;
    results.push(`[${vp.name}] 8.band图片加载: naturalWidth=${bandNw}`);

    // 9. 发现页横向溢出
    const ow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push(`[${vp.name}] 9.发现页横向溢出: ${ow2}px ${ow2 === 0 ? 'OK' : 'FAIL'}`);

    await page.locator('.disc-band').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}b2-discover-${vp.name}.png` });

    // 10. band 点击跳转目的地详情
    await page.locator('.disc-band').click();
    await page.waitForTimeout(1200);
    const url2 = page.url();
    results.push(`[${vp.name}] 10.band点击跳转: ${url2.includes('#/dest/') ? 'OK ' + url2.split('#')[1] : 'FAIL ' + url2}`);

    // 11. B1 轮播不受影响（回首页）
    await page.goto(BASE + '#/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.car-slide.on', { timeout: 15000 });
    const heroTitle = await page.locator('.car-slide.on .car-title').textContent();
    const heroCta = await page.locator('.car-slide.on .car-cta').count();
    results.push(`[${vp.name}] 11.B1轮播正常: title="${(heroTitle || '').trim()}" cta=${heroCta}`);

    await ctx.close();
  }

  await browser.close();
  console.log('=== B2 测试结果 ===');
  results.forEach(r => console.log(r));
  console.log('=== 控制台错误 ===');
  console.log(errors.length ? errors.join('\n') : '(无)');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
