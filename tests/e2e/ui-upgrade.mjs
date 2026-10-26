/* UI 升级专项（真实仓库，Firefox）：首屏眉题、卡片比较信息、筛选状态条、详情事实条与页内导航、收藏 Toast、窄屏无溢出。 */
import { firefox } from 'playwright-core';
const BASE = 'http://127.0.0.1:8130';
let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra); }
}
const browser = await firefox.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// 首页：眉题含真实计数 + 卡片含比较信息
await page.goto(BASE + '/#/');
await page.waitForSelector('.hero-eyebrow');
const eyebrow = await page.textContent('.hero-eyebrow');
ok('首页眉题含 30 个目的地', /30 个目的地/.test(eyebrow || ''), eyebrow);
await page.waitForSelector('.dest-card');
const meta = await page.textContent('.dest-card .card-meta');
ok('首页卡片含建议天数/适游季节', /建议 .* 天/.test(meta || '') && /适游/.test(meta || ''), meta);

// 发现页：主题筛选状态条 + 单项清除
await page.goto(BASE + '/#/discover?theme=mountains');
await page.waitForSelector('.filter-chip[data-clear-key="theme"]');
const chipText = await page.textContent('.filter-chip[data-clear-key="theme"]');
ok('发现页主题筛选芯片可见（山岳）', /山岳/.test(chipText || ''), chipText);
const countBefore = await page.textContent('#discover-results .muted');
await page.click('.filter-chip[data-clear-key="theme"]');
await page.waitForFunction(() => !document.querySelector('.filter-chip[data-clear-key="theme"]'));
const countAfter = await page.textContent('#discover-results .muted');
ok('清除单项筛选后恢复全部且 URL 不再含 theme', /共 30 个目的地/.test(countAfter || '') && !page.url().includes('theme='), countAfter + ' | ' + page.url());
// 关键词筛选芯片
await page.goto(BASE + '/#/discover?keyword=黄山');
await page.waitForSelector('.filter-chip[data-clear-key="keyword"]');
ok('关键词筛选芯片可见', (await page.textContent('.filter-chip[data-clear-key="keyword"]') || '').includes('黄山'));

// 详情页：事实条 + 页内导航（Hash 路由不得被破坏）
await page.goto(BASE + '/#/dest/huangshan');
await page.waitForSelector('.fact-strip');
const facts = await page.textContent('.fact-strip');
ok('详情事实条含适游季节与建议游玩', /适游季节/.test(facts || '') && /建议游玩/.test(facts || ''), facts);
await page.waitForSelector('[data-nav-related]:not([hidden])', { timeout: 5000 }).catch(() => {});
const navRelatedVisible = await page.evaluate(() => {
  const b = document.querySelector('[data-nav-related]');
  return b && !b.hidden;
});
ok('详情相关目的地导航按钮在有结果时显示', !!navRelatedVisible);
const hashBefore = await page.evaluate(() => location.hash);
await page.click('[data-scroll-to="sec-transport"]');
await page.waitForTimeout(600);
const hashAfter = await page.evaluate(() => location.hash);
const scrolled = await page.evaluate(() => window.scrollY > 200);
ok('页内导航滚动且不破坏 Hash 路由', hashBefore === hashAfter && hashAfter.startsWith('#/dest/huangshan') && scrolled, hashBefore + ' -> ' + hashAfter + ' scrollY ok=' + scrolled);

// 收藏 Toast
await page.click('.detail-actions [data-fav]');
await page.waitForSelector('.toast.show');
const toastText = await page.textContent('.toast');
ok('收藏后出现 Toast', /已收藏/.test(toastText || ''), toastText);
const pressed = await page.getAttribute('.detail-actions [data-fav]', 'aria-pressed');
ok('收藏按钮 aria-pressed 同步', pressed === 'true', pressed);
await page.click('.detail-actions [data-fav]');
await page.waitForFunction(() => document.querySelector('.toast.show')?.textContent?.includes('已取消收藏'));
ok('取消收藏 Toast 文案正确', true);
await ctx.close();

// 窄屏与桌面无横向溢出：首页/发现/详情/规划/收藏
for (const w of [360, 1440]) {
  const c2 = await browser.newContext({ viewport: { width: w, height: w === 360 ? 800 : 900 } });
  const p2 = await c2.newPage();
  for (const [name, url] of [['home', '/#/'], ['discover', '/#/discover'], ['detail', '/#/dest/huangshan'], ['planner', '/#/planner'], ['favorites', '/#/favorites']]) {
    await p2.goto(BASE + url);
    await p2.waitForTimeout(1200);
    const over = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`无横向溢出 ${w}px ${name}`, over <= 0, 'overflow=' + over);
  }
  await c2.close();
}
await browser.close();
console.log(`UI-UPGRADE SUMMARY: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
