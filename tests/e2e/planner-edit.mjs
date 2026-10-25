/*
 * 行程编辑专项：生成 3 天草案 → 上移第 2 天 → 刷新仍为编辑后顺序 → 插入一天（日期顺延）
 * → 删除一天（日期回补）→ 删空出现空态引导 → 全程无未捕获错误；390px 视口无横向溢出。
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
const dayTexts = async () => page.evaluate(() => [...document.querySelectorAll('#plan-list li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()));
/* 本轮后每日卡片结构：日期与名称分置 .plan-date / .plan-name（原“日期：名称”纯文本已不存在） */
const dayDates = async () => page.evaluate(() => [...document.querySelectorAll('#plan-list li .plan-date')].map(el => el.textContent.trim()));
const dayNames = async () => page.evaluate(() => [...document.querySelectorAll('#plan-list li .plan-name')].map(el => el.textContent.trim()));

await page.goto(BASE + '/#/planner');
await page.waitForSelector('#plan-form');
await page.evaluate(() => { localStorage.clear(); });
await page.reload();
await page.waitForSelector('#plan-form');
await page.fill('#p-date', '2026-11-02');
await page.fill('#p-days', '3');
await page.click('#plan-form button[type="submit"]');
await page.waitForSelector('#plan-list li', { timeout: 8000 });
let rows = await dayTexts();
check('生成 3 天草案', rows.length === 3, rows.join(' | '));
check('首日上移按钮禁用、末日下移按钮禁用', await page.evaluate(() => {
  const btns = [...document.querySelectorAll('#plan-list li .plan-actions button')];
  const firstUp = btns.find(b => b.dataset.act === 'up' && b.dataset.i === '0');
  const lastDown = btns.find(b => b.dataset.act === 'down' && b.dataset.i === '2');
  return firstUp.disabled && lastDown.disabled;
}));

// 上移第 2 天（data-i=1 的 up）
const beforeNames = await dayNames();
await page.click('button[data-act="up"][data-i="1"]');
await page.waitForTimeout(300);
rows = await dayTexts();
const afterNames = await dayNames();
const afterDates = await dayDates();
check('上移第 2 天：与第 1 天交换目的地，日期序列不变', afterNames[0] === beforeNames[1] && afterNames[1] === beforeNames[0] && afterDates[0] === '2026-11-02', afterNames.join(' | '));
check('编辑后显示已保存提示', (await page.textContent('#plan-result')).includes('已保存'));

// 刷新后仍为编辑后顺序
await page.reload();
await page.waitForSelector('#plan-list li', { timeout: 8000 });
const afterReload = await dayTexts();
check('刷新后编辑顺序仍在', afterReload.join(' | ') === rows.join(' | '), afterReload.join(' | '));

// 在第 1 天后插入一天（选第 1 个目的地）
await page.click('button[data-act="insert"][data-i="0"]');
await page.waitForTimeout(200);
await page.selectOption('[data-insert-select="0"]', { index: 1 });
await page.click('button[data-act="confirm-insert"][data-i="0"]');
await page.waitForTimeout(300);
let dates = await dayDates();
check('插入后 4 天且日期连续顺延', dates.length === 4 && dates.join(',') === '2026-11-02,2026-11-03,2026-11-04,2026-11-05', dates.join(','));

// 删除第 2 天，日期回补
await page.click('button[data-act="remove"][data-i="1"]');
await page.waitForTimeout(300);
dates = await dayDates();
check('删除后 3 天且日期连续回补', dates.length === 3 && dates.join(',') === '2026-11-02,2026-11-03,2026-11-04', dates.join(','));

// 删空
await page.click('button[data-act="remove"][data-i="0"]');
await page.waitForTimeout(200);
await page.click('button[data-act="remove"][data-i="0"]');
await page.waitForTimeout(200);
await page.click('button[data-act="remove"][data-i="0"]');
await page.waitForTimeout(300);
check('删空后出现空态引导', (await page.textContent('#plan-result')).includes('还没有行程安排'));
await page.reload();
await page.waitForTimeout(500);
check('刷新后空态仍在（草案已保存为空）', (await page.textContent('#plan-result')).includes('还没有行程安排'));

// 390px 无横向溢出
const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= 390);
check('390px 视口无横向溢出', overflow, 'scrollWidth=' + await page.evaluate(() => document.documentElement.scrollWidth));
check('全程无未捕获页面错误', errs.length === 0, errs.join(' | '));

console.log('PLANNER-EDIT SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed (' + KIND + ')');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
