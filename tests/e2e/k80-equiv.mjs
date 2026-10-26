/* K80 等效检查（非真机）：Firefox 移动视口下逐项验证与 K80 清单对应的功能。
   明确声明：这不是 K80 真机测试；真机项见验收报告，全部记为未执行。 */
import { firefox } from 'playwright-core';
const BASE = 'http://127.0.0.1:8130';
let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra); }
}
const browser = await firefox.launch();
for (const [w, h] of [[390, 844], [480, 1067]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  // 1 首页布局/标题/大图
  await page.goto(BASE + '/#/');
  await page.waitForSelector('.hero-img');
  const heroOk = await page.evaluate(() => {
    const img = document.querySelector('.hero-img');
    return img && img.naturalWidth > 0;
  });
  ok(`${w} 首页大图加载`, heroOk);
  // 2 搜索框焦点与输入
  await page.click('.hero-search input');
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.id === 'home-q');
  ok(`${w} 搜索框可聚焦`, focused);
  await page.fill('.hero-search input', '黄山');
  await page.click('.hero-search button');
  await page.waitForTimeout(800);
  ok(`${w} 搜索跳转到发现页且关键词同步`, page.url().includes('/discover') && page.url().includes('keyword='));
  // 3/4/6 发现页状态条 + 单项清除 + URL 同步
  await page.goto(BASE + '/#/discover?theme=mountains&season=autumn');
  await page.waitForSelector('.filter-chip[data-clear-key="theme"]');
  ok(`${w} 筛选状态条可见`, !!(await page.textContent('.active-filters')));
  await page.click('.filter-chip[data-clear-key="theme"]');
  await page.waitForFunction(() => !document.querySelector('.filter-chip[data-clear-key="theme"]'));
  ok(`${w} 单项清除后 URL 同步`, !page.url().includes('theme=') && page.url().includes('season=autumn'), page.url());
  // 5 无结果 + 清除
  await page.fill('#f-keyword', '不存在的目的地xyz');
  await page.waitForTimeout(600);
  const clears = await page.locator('[data-clear-filters]').count();
  ok(`${w} 无结果时恰一个清除按钮`, clears === 1, 'count=' + clears);
  await page.click('[data-clear-filters]');
  await page.waitForTimeout(400);
  ok(`${w} 清除后恢复 30 条`, (await page.locator('#discover-results .dest-card').count()) === 30);
  // 后退恢复（URL 同步的另一方向）
  await page.goto(BASE + '/#/discover?theme=mountains');
  await page.waitForSelector('.filter-chip[data-clear-key="theme"]');
  await page.goto(BASE + '/#/discover');
  await page.waitForTimeout(500);
  await page.goBack();
  await page.waitForTimeout(800);
  ok(`${w} 后退恢复筛选状态`, !!(await page.locator('.filter-chip[data-clear-key="theme"]').count()), page.url());
  // 7 卡片季节与天数
  await page.goto(BASE + '/#/discover');
  await page.waitForSelector('.dest-card .card-meta');
  ok(`${w} 卡片含季节与天数`, /适游/.test((await page.textContent('.dest-card .card-meta')) || ''));
  // 8/9 详情事实条换行 + 页内导航落点（关键：落点不被吸顶栏遮挡）
  await page.goto(BASE + '/#/dest/huangshan');
  await page.waitForSelector('.fact-strip');
  const factOverflow = await page.evaluate(() => {
    const el = document.querySelector('.fact-strip');
    return el.scrollWidth - el.clientWidth;
  });
  ok(`${w} 事实条无横向溢出`, factOverflow <= 0, 'overflow=' + factOverflow);
  const topbarH = await page.evaluate(() => {
    const t = document.querySelector('.topbar');
    return t ? t.getBoundingClientRect().height : 0;
  });
  await page.click('[data-scroll-to="sec-transport"]');
  await page.waitForTimeout(700);
  const landTop = await page.evaluate(() => {
    const el = document.getElementById('sec-transport');
    return el ? el.getBoundingClientRect().top : -9999;
  });
  ok(`${w} 页内导航落点不被吸顶栏遮挡（topbar=${Math.round(topbarH)} 落点=${Math.round(landTop)}）`, landTop >= topbarH - 1 && landTop < 220, 'top=' + landTop);
  // 10 收藏 Toast
  await page.click('.detail-actions [data-fav]');
  await page.waitForSelector('.toast.show');
  ok(`${w} 收藏 Toast 出现`, /已收藏/.test((await page.textContent('.toast')) || ''));
  await page.click('.detail-actions [data-fav]');
  // 11 行程保存提示
  await page.goto(BASE + '/#/planner');
  await page.waitForSelector('#plan-form');
  await page.fill('#p-days', '2');
  await page.click('#plan-form button[type="submit"]');
  await page.waitForSelector('#plan-status', { timeout: 5000 }).catch(() => {});
  const planStatus = await page.textContent('#plan-status').catch(() => '');
  ok(`${w} 行程保存提示可见`, /已保存/.test(planStatus || ''), planStatus);
  // 12 图片加载与滚动
  await page.goto(BASE + '/#/dest/huangshan');
  await page.waitForSelector('.slide-img');
  const imgOk = await page.evaluate(() => {
    const img = document.querySelector('.slide-img');
    return img && img.naturalWidth > 0;
  });
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(300);
  const scrolled = await page.evaluate(() => window.scrollY > 100);
  ok(`${w} 详情图片加载且页面可滚动`, imgOk && scrolled);
  // 13 返回与 Hash 路由
  await page.goto(BASE + '/#/discover');
  await page.waitForSelector('#discover-results');
  await page.goto(BASE + '/#/dest/huangshan');
  await page.waitForSelector('article.detail h2');
  await page.goBack();
  await page.waitForTimeout(800);
  ok(`${w} 返回后回到发现页`, page.url().includes('/discover') && (await page.locator('#discover-results').count()) === 1, page.url());
  // 14 天气关闭
  await page.goto(BASE + '/#/dest/huangshan');
  await page.waitForSelector('#weather-box');
  const wtext = await page.textContent('#weather-box');
  ok(`${w} 天气保持关闭`, /天气暂不可用/.test(wtext || ''), wtext);
  await ctx.close();
}
await browser.close();
console.log(`K80-EQUIV SUMMARY: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
