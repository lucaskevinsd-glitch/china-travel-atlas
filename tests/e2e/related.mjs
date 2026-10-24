/*
 * 相关目的地专项：详情页推荐区出现、恰 4 张、不含自身、链接有效；单条数据时整段隐藏。
 * 夹具：CTA_FIXTURE（默认 /tmp/cta-state-site，30 条）；http.server 8125。CTA_BROWSER=firefox|chromium。
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
await page.goto(BASE + '/#/dest/zhangjiajie-national-forest-park');
await page.waitForSelector('#related-box:not([hidden])', { timeout: 8000 });
const cards = await page.locator('[data-related] .dest-card').count();
check('推荐区显示 4 张卡片', cards === 4, String(cards));
const hrefs = await page.evaluate(() => [...document.querySelectorAll('[data-related] .dest-card .card-link')].map(a => a.getAttribute('href')));
check('推荐不含自身', !hrefs.some(h => h.includes('zhangjiajie')));
check('推荐链接均为目的地路由', hrefs.every(h => h.startsWith('#/dest/')), hrefs.join(','));
await page.click('[data-related] .dest-card .card-link >> nth=0');
await page.waitForTimeout(700);
check('点击推荐可进入对应详情', await page.evaluate(() => location.hash.startsWith('#/dest/') && !!document.querySelector('article.detail h2')));
await page.goto(BASE + '/#/dest/yalong-bay');
await page.waitForSelector('#related-box:not([hidden])', { timeout: 8000 });
const yCards = await page.locator('[data-related] .dest-card').count();
const yHref = await page.evaluate(() => document.querySelector('[data-related] .dest-card .card-link')?.getAttribute('href'));
check('弱匹配不填满：亚龙湾仅推荐 1 张（鼓浪屿）', yCards === 1 && yHref.includes('gulangyu'), yCards + ' ' + yHref);
check('全程无未捕获页面错误', errs.length === 0, errs.join(';').slice(0, 160));
console.log('RELATED SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed (' + KIND + ')');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
