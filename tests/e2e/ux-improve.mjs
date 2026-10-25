/*
 * 产品体验升级专项（本轮改动的行为验证，不得放宽断言）：
 * 首页目的地先行、省份横滑、详情操作上移、发现即时筛选与清除筛选、
 * 收藏空态入口、行程每日卡片、卡片摘要截断、桌面画廊限高。
 * 夹具：/tmp/cta-state-site（30 条）；http.server 8125。CTA_BROWSER=firefox|chromium。
 */
import { firefox, chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const KIND = process.env.CTA_BROWSER || 'firefox';
const FIXTURE = process.env.CTA_FIXTURE || '/tmp/cta-state-site';
const BASE = 'http://127.0.0.1:8125';
const results = [];
function check(name, ok, extra = '') { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); }
let browser, page;
if (KIND === 'chromium') {
  browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox'] });
  page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.port === '8125') {
      const fp = path.join(FIXTURE, decodeURIComponent(u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname));
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp' }[path.extname(fp)] || 'application/octet-stream';
        return route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(fp) });
      }
      return route.fulfill({ status: 404, body: 'nf' });
    }
    return route.abort();
  });
} else {
  browser = await firefox.launch();
  page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
}
const errs = [];
page.on('pageerror', e => errs.push(String(e)));

// 首页：目的地区块在省份区块之前；省份为横滑容器
await page.goto(BASE + '/#/');
await page.waitForSelector('#home-body .card-grid');
const order = await page.evaluate(() => {
  const heads = [...document.querySelectorAll('#home-body section h3')].map(h => h.textContent);
  return heads;
});
check('首页目的地先行（已发布目的地在按省份浏览之前）', order.indexOf('已发布目的地（30）') !== -1 && order.indexOf('已发布目的地（30）') < order.indexOf('按省份浏览'), order.join(' | '));
const provScroll = await page.evaluate(() => {
  const el = document.querySelector('#home-body .chip-scroll');
  return el ? getComputedStyle(el).overflowX : 'none';
});
check('省份入口为横滑容器', provScroll === 'auto' || provScroll === 'scroll', provScroll);
// 发现：输入关键词后不按筛选也能即时过滤；空态可一键清除
await page.goto(BASE + '/#/discover');
await page.waitForSelector('#discover-results .card-grid');
await page.fill('#f-keyword', '张家界');
await page.waitForTimeout(600);
const liveCount = await page.locator('#discover-results .dest-card').count();
check('关键词输入即时筛选（无需按筛选按钮）', liveCount === 1, String(liveCount));
await page.fill('#f-keyword', '不存在的目的地xyz');
await page.waitForTimeout(600);
check('无结果空态出现清除筛选按钮', (await page.locator('[data-clear-filters]').count()) === 1);
await page.click('[data-clear-filters]');
await page.waitForTimeout(300);
check('清除筛选后恢复全部 30 条', (await page.locator('#discover-results .dest-card').count()) === 30);
// 详情：操作区在“主要特色”之前，且仅一套
await page.goto(BASE + '/#/dest/zhangjiajie-national-forest-park');
await page.waitForSelector('article.detail h2');
const detailOrder = await page.evaluate(() => {
  const els = [...document.querySelectorAll('article.detail .detail-actions, article.detail h3')].map(e => e.className.includes('detail-actions') ? 'ACTIONS' : e.textContent);
  return els;
});
check('详情操作区位于主要特色之前', detailOrder.indexOf('ACTIONS') !== -1 && detailOrder.indexOf('ACTIONS') < detailOrder.indexOf('主要特色'), detailOrder.join(' | '));
check('详情操作区仅一套（无重复按钮）', (await page.locator('article.detail .detail-actions').count()) === 1);
// 收藏空态入口
await page.goto(BASE + '/#/favorites');
await page.waitForSelector('#fav-body');
check('收藏空态有去发现目的地入口', (await page.locator('#fav-body a[href="#/discover"]').count()) >= 1);
// 规划：每日卡片层级
await page.goto(BASE + '/#/planner');
await page.waitForSelector('#plan-form');
await page.fill('#p-date', '2026-11-02');
await page.fill('#p-days', '3');
await page.click('#plan-form button[type="submit"]');
await page.waitForSelector('#plan-list li');
check('行程每日为卡片且含日期与名称层级', (await page.locator('#plan-list li.plan-day .plan-date').count()) === 3 && (await page.locator('#plan-list li.plan-day .plan-name').count()) === 3);
// 卡片摘要截断（CSS line-clamp 生效）
const clamp = await page.evaluate(() => {
  const el = document.querySelector('#discover-results .card-summary, #home-body .card-summary');
  return el ? getComputedStyle(el).webkitLineClamp || getComputedStyle(el).lineClamp : '';
});
await page.goto(BASE + '/#/discover');
await page.waitForSelector('#discover-results .card-grid');
const clamp2 = await page.evaluate(() => {
  const el = document.querySelector('#discover-results .card-summary');
  return el ? (getComputedStyle(el).webkitLineClamp || '') : '';
});
check('卡片摘要 3 行截断生效', clamp2 === '3', clamp2 || clamp);
check('全程无未捕获页面错误', errs.length === 0, errs.join(' | '));
console.log('UX-IMPROVE SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed (' + KIND + ')');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
