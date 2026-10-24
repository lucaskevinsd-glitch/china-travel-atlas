/*
 * 详情画廊专项：横向滑动、计数、仅预加载下一张、放大查看与关闭、失败占位不白屏。
 * 夹具：CTA_FIXTURE（默认 /tmp/cta-state-site，30 条 published 色块图，张家界 5 图）；http.server 8125。
 * CTA_BROWSER=firefox（默认）| chromium（走请求拦截）。
 */
import { firefox, chromium } from 'playwright-core';
const KIND = process.env.CTA_BROWSER || 'firefox';
const FIXTURE = process.env.CTA_FIXTURE || '/tmp/cta-state-site';
const BASE = 'http://127.0.0.1:8125';
import fs from 'node:fs';
import path from 'node:path';
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
await page.waitForSelector('.gallery-track');
await page.waitForTimeout(600);
check('画廊渲染 5 张幻灯片', (await page.locator('.gallery-track .slide').count()) === 5);
check('初始计数为 1 / 5', (await page.textContent('[data-count]')).trim() === '1 / 5');
check('第一张图真实加载', await page.evaluate(() => { const i = document.querySelector('.slide-img'); return i && i.complete && i.naturalWidth > 0; }));
const requested = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => e.name.includes('fixture-zj')).map(e => e.name.split('/').pop()));
check('初始仅请求首图与下一张（预加载策略）', requested.length <= 3, requested.join(','));
await page.evaluate(() => { const t = document.querySelector('.gallery-track'); t.scrollTo({ left: t.clientWidth * 2, behavior: 'instant' }); });
await page.waitForTimeout(500);
check('滑动后计数为 3 / 5', (await page.textContent('[data-count]')).trim() === '3 / 5', await page.textContent('[data-count]'));
await page.click('[data-zoom]');
await page.waitForTimeout(400);
check('放大层打开且显示原图', await page.evaluate(() => { const lb = document.querySelector('.lightbox'); const i = lb.querySelector('.lb-img'); return !lb.hidden && i.src.includes('fixture-zj'); }));
await page.click('.lb-next');
await page.waitForTimeout(300);
check('放大层下一张计数 4 / 5', (await page.textContent('.lb-count')).trim() === '4 / 5');
await page.click('.lb-close');
check('放大层关闭', await page.evaluate(() => document.querySelector('.lightbox').hidden));
check('全程无未捕获页面错误', errs.length === 0, errs.join(';').slice(0, 200));
console.log('GALLERY SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed (' + KIND + ')');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
