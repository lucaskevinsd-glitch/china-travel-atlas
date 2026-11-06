/* B1 首页沉浸式轮播验收：四视口 × 10 项 */
import { firefox } from 'playwright-core';

const BASE = 'http://127.0.0.1:8130/';
const SHOTS = '/home/hatch/workspace/cta_b1/shots/';
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
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      ignoreHTTPSErrors: true,
      hasTouch: vp.w <= 500,
      isMobile: vp.w <= 500,
    });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${vp.name}] ${m.text().slice(0, 120)}`); });
    page.on('pageerror', e => errors.push(`[${vp.name}] PAGEERROR: ${String(e).slice(0, 120)}`));

    await page.goto(BASE + '#/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.car-slide.on', { timeout: 15000 });
    await page.waitForTimeout(800);

    // 1. 首屏：caption 层存在且可见
    const cap = await page.locator('.car-slide.on .car-caption').count();
    const title = cap ? await page.locator('.car-slide.on .car-title').textContent() : null;
    const cta = cap ? await page.locator('.car-slide.on .car-cta').count() : 0;
    results.push(`[${vp.name}] 1.首屏信息层: caption=${cap} title="${(title || '').trim()}" cta=${cta}`);

    // 2. 图片实际加载（naturalWidth>0）
    const nw = await page.locator('.car-slide.on .car-img').evaluate(el => el.naturalWidth);
    results.push(`[${vp.name}] 2.首图加载: naturalWidth=${nw}`);

    // 3. 横向溢出检查
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push(`[${vp.name}] 3.横向溢出: ${ow}px ${ow === 0 ? 'OK' : 'FAIL'}`);

    await page.screenshot({ path: `${SHOTS}b1-hero-${vp.name}.png` });

    // 4. 手动下一张
    await page.click('[data-car-next]');
    await page.waitForTimeout(1400);
    const t2 = await page.locator('.car-slide.on .car-title').textContent();
    results.push(`[${vp.name}] 4.手动下一张: title="${(t2 || '').trim()}"`);

    // 5. 圆点跳转（第5张）
    await page.click('.car-dot[data-dot="4"]');
    await page.waitForTimeout(1400);
    const t5 = await page.locator('.car-slide.on .car-title').textContent();
    results.push(`[${vp.name}] 5.圆点跳第5张: title="${(t5 || '').trim()}"`);
    await page.screenshot({ path: `${SHOTS}b1-hero-${vp.name}-s5.png` });

    // 6. CTA 跳转（点击当前 slide）
    await page.locator('.car-slide.on').click();
    await page.waitForTimeout(1200);
    const url = page.url();
    results.push(`[${vp.name}] 6.CTA跳转: ${url.includes('#/dest/') ? 'OK ' + url.split('#')[1] : 'FAIL ' + url}`);
    await page.goBack();
    await page.waitForSelector('.car-slide.on', { timeout: 15000 });

    // 7. 暂停按钮（显式暂停→按钮变"播放轮播"；再点恢复→变"暂停轮播"）
    await page.click('[data-car-pause]');
    await page.waitForTimeout(300);
    const pausedLabel = await page.locator('[data-car-pause]').getAttribute('aria-label');
    const pauseOk1 = pausedLabel === '播放轮播';
    await page.click('[data-car-pause]');
    await page.waitForTimeout(300);
    const resumedLabel = await page.locator('[data-car-pause]').getAttribute('aria-label');
    const pauseOk2 = resumedLabel === '暂停轮播';
    results.push(`[${vp.name}] 7.暂停/恢复: "${pausedLabel}"→"${resumedLabel}" ${pauseOk1 && pauseOk2 ? 'OK' : 'FAIL'}`);

    // 8. 自动切换（等7秒）
    const before = await page.locator('.car-slide.on .car-title').textContent();
    await page.waitForTimeout(7000);
    const after = await page.locator('.car-slide.on .car-title').textContent();
    results.push(`[${vp.name}] 8.自动切换: "${(before || '').trim()}" → "${(after || '').trim()}" ${before !== after ? 'OK' : 'FAIL'}`);

    // 9. 触屏滑动（仅移动视口）
    if (vp.w <= 390) {
      const b4 = await page.locator('.car-slide.on .car-title').textContent();
      // 滑动逻辑用合成 TouchEvent 验证（Firefox 无 Touch 构造器；tap 会误触 slide 链接故不用）
      await page.evaluate(() => {
        const root = document.querySelector('[data-carousel]');
        const e1 = new Event('touchstart', { bubbles: true, cancelable: true });
        e1.touches = [{ clientX: 300, clientY: 400 }];
        root.dispatchEvent(e1);
        const e2 = new Event('touchend', { bubbles: true, cancelable: true });
        e2.changedTouches = [{ clientX: 100, clientY: 400 }];
        root.dispatchEvent(e2);
      });
      await page.waitForTimeout(1400);
      const b5 = await page.locator('.car-slide.on .car-title').textContent();
      results.push(`[${vp.name}] 9.触屏滑动: "${(b4 || '').trim()}" → "${(b5 || '').trim()}" ${b4 !== b5 ? 'OK' : 'FAIL'}`);
    }

    // 10. 版权页 heroes 分区
    await page.goto(BASE + '#/credits', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const heroSec = await page.locator('#cd-heroes').count();
    const heroRows = await page.locator('#cd-heroes .credit-img').count();
    results.push(`[${vp.name}] 10.版权页heroes分区: section=${heroSec} rows=${heroRows}`);

    await ctx.close();
  }

  // 减动效：单独 context
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ignoreHTTPSErrors: true });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '#/', { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForSelector('.car-slide.on', { timeout: 15000 });
  const rm1 = await p2.locator('.car-slide.on .car-title').textContent();
  await p2.waitForTimeout(7000);
  const rm2 = await p2.locator('.car-slide.on .car-title').textContent();
  results.push(`[reduce-motion] 自动切换应停止: "${(rm1 || '').trim()}" → "${(rm2 || '').trim()}" ${rm1 === rm2 ? 'OK' : 'FAIL'}`);
  await ctx2.close();

  await browser.close();
  console.log('=== B1 测试结果 ===');
  results.forEach(r => console.log(r));
  console.log('=== 控制台错误 ===');
  console.log(errors.length ? errors.join('\n') : '(无)');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
