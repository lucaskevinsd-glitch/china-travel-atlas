/*
 * 发现页状态恢复专项测试（场景 A/B/C）。与 smoke 夹具独立：
 * 夹具目录 CTA_FIXTURE（默认 /tmp/cta-state-site）含 30 条 published 测试记录（色块图，标注 fixture）。
 * 运行：CTA_BROWSER=firefox（需先以该目录启动 http.server 8125）或 CTA_BROWSER=chromium（请求拦截，无需服务器）。
 */
import { chromium, firefox } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MODE = process.env.CTA_BROWSER || 'chromium';
const FIXTURE = process.env.CTA_FIXTURE || '/tmp/cta-state-site';
const BASE = MODE === 'firefox' ? 'http://127.0.0.1:8125' : 'http://cta.test:8125';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const results = [];
function check(name, ok, extra = '') { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); }

let browser;
if (MODE === 'firefox') browser = await firefox.launch();
else browser = await chromium.launch({ executablePath: process.env.CTA_CHROME || '/opt/meta-chromium/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));
if (MODE !== 'firefox') {
  await page.route('http://cta.test:8125/**', async route => {
    const url = new URL(route.request().url());
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(FIXTURE, rel);
    if (!file.startsWith(FIXTURE)) return route.fulfill({ status: 403, body: 'forbidden' });
    try { const body = await readFile(file); return route.fulfill({ status: 200, body, contentType: MIME[path.extname(file)] || 'application/octet-stream' }); }
    catch { return route.fulfill({ status: 404, body: 'not found' }); }
  });
}
await page.route('**api.open-meteo.com**', r => r.abort());

// 场景 A：发现页筛选 + 滚动 -> 详情 -> 返回恢复
await page.goto(BASE + '/#/discover');
await page.waitForSelector('#discover-results .dest-card');
await page.selectOption('#f-season', 'autumn');
await page.click('#discover-form button[type="submit"]');
await page.waitForTimeout(250);
const countA = await page.textContent('#discover-results');
await page.evaluate(() => window.scrollTo(0, 500));
await page.waitForTimeout(400);
await page.evaluate(() => { const a = document.querySelector('#discover-results .dest-card a') || document.querySelector('#discover-results .dest-card'); a.click(); });
await page.waitForSelector('article.detail h2');
await page.goBack();
await page.waitForSelector('#discover-form');
await page.waitForTimeout(700);
check('A 返回后季节筛选保留', (await page.inputValue('#f-season')) === 'autumn');
check('A 返回后结果集一致', (await page.textContent('#discover-results')) === countA);
const scrollA = await page.evaluate(() => window.scrollY);
check('A 返回后滚动位置恢复', scrollA > 250, 'scrollY=' + scrollA);

// 场景 B：首页 -> 详情 -> 返回首页，不受发现页状态影响
await page.goto(BASE + '/#/');
await page.waitForSelector('#home-body .dest-card');
await page.evaluate(() => { const a = document.querySelector('#home-body .dest-card a') || document.querySelector('#home-body .dest-card'); a.click(); });
await page.waitForSelector('article.detail h2');
await page.goBack();
await page.waitForSelector('#home-body .dest-card');
check('B 返回首页正常渲染', (await page.evaluate(() => location.hash)) === '#/');

// 场景 C：再次进入发现页 -> 另一个详情 -> 返回，状态不累积出错
await page.goto(BASE + '/#/discover');
await page.waitForSelector('#discover-results .dest-card');
check('C 再次进入发现页筛选仍保留', (await page.inputValue('#f-season')) === 'autumn');
await page.evaluate(() => window.scrollTo(0, 400));
await page.waitForTimeout(300);
const cards = page.locator('#discover-results .dest-card');
const n = await cards.count();
await page.evaluate(() => { const a = document.querySelector('#discover-results .dest-card a') || document.querySelector('#discover-results .dest-card'); a.click(); });
await page.waitForSelector('article.detail h2');
await page.goBack();
await page.waitForSelector('#discover-form');
await page.waitForTimeout(700);
check('C 二次返回筛选保留', (await page.inputValue('#f-season')) === 'autumn', 'cards=' + n);
const scrollC = await page.evaluate(() => window.scrollY);
check('C 二次返回滚动恢复', scrollC > 150, 'scrollY=' + scrollC);
check('全程无未捕获页面错误', pageErrors.length === 0, pageErrors.join(';').slice(0, 200));

console.log('DISCOVER-STATE SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed (' + MODE + ')');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
