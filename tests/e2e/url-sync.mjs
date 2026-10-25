/*
 * 发现页筛选 URL 同步专项：直接打开、刷新、新标签分享、清除筛选、非法参数、
 * 前进后退、URL 优先于 localStorage、输入同步 URL。夹具 /tmp/cta-state-site（30 条）。
 * CTA_BROWSER=firefox（http.server 8125）| chromium（请求拦截）。
 */
import { firefox, chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const KIND = process.env.CTA_BROWSER || 'firefox';
const FIXTURE = process.env.CTA_FIXTURE || '/tmp/cta-state-site';
/* Chromium 用 cta.test 域名走请求拦截（与 discover-state.mjs 相同做法），避免 127.0.0.1 触发本地网络访问检查。 */
const BASE = KIND === 'chromium' ? 'http://cta.test:8125' : 'http://127.0.0.1:8125';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp' };
const results = [];
function check(name, ok, extra = '') { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); }
let browser, page;
async function armInterception(pg) {
  await pg.route('http://cta.test:8125/**', async route => {
    const url = new URL(route.request().url());
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(FIXTURE, rel);
    if (!file.startsWith(FIXTURE)) return route.fulfill({ status: 403, body: 'forbidden' });
    try { const body = fs.readFileSync(file); return route.fulfill({ status: 200, body, contentType: MIME[path.extname(file)] || 'application/octet-stream' }); }
    catch { return route.fulfill({ status: 404, body: 'not found' }); }
  });
}
if (KIND === 'chromium') {
  browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox'] });
  page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await armInterception(page);
} else {
  browser = await firefox.launch();
  page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
}
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
const cardCount = () => page.locator('#discover-results .dest-card').count();
const formVals = () => page.evaluate(() => ({
  keyword: document.querySelector('#f-keyword').value,
  province: document.querySelector('#f-province').value,
  theme: document.querySelector('#f-theme').value,
  season: document.querySelector('#f-season').value,
}));

// 1. 直接打开带参数链接：恢复筛选与结果
await page.goto(BASE + '/#/discover?keyword=' + encodeURIComponent('张家界'));
await page.waitForSelector('#discover-results .dest-card');
check('直接打开关键词链接恢复结果', (await cardCount()) === 1 && (await formVals()).keyword === '张家界');

// 2. 刷新后筛选不变
await page.reload();
await page.waitForSelector('#discover-results .dest-card');
check('刷新后筛选与结果一致', (await cardCount()) === 1 && (await formVals()).keyword === '张家界');

// 3. 新标签页打开同一链接：结果一致（可分享）
const page2 = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
if (KIND === 'chromium') await armInterception(page2);
await page2.goto(BASE + '/#/discover?keyword=' + encodeURIComponent('张家界'));
await page2.waitForSelector('#discover-results .dest-card');
check('新标签页打开同一链接结果一致', (await page2.locator('#discover-results .dest-card').count()) === 1);
await page2.close();

// 4. 多参数链接：省份 + 主题 + 季节同时恢复
await page.goto(BASE + '/#/discover?province=' + encodeURIComponent('湖南省') + '&theme=mountains&season=autumn');
await page.waitForSelector('#discover-results .dest-card');
const v4 = await formVals();
check('多参数链接恢复全部筛选项', v4.province === '湖南省' && v4.theme === 'mountains' && v4.season === 'autumn', JSON.stringify(v4));
const count4 = await cardCount();
await page.reload();
await page.waitForSelector('#discover-results .dest-card');
check('多参数链接刷新后结果一致', (await cardCount()) === count4, String(count4));

// 5. URL 优先于 localStorage：先以 UI 写入 season=autumn 的保存状态，再打开只有 province 的链接
await page.goto(BASE + '/#/discover');
await page.waitForSelector('#discover-form');
await page.selectOption('#f-season', 'autumn');
await page.waitForTimeout(300);
await page.goto(BASE + '/#/discover?province=' + encodeURIComponent('湖南省'));
await page.waitForSelector('#discover-results .dest-card');
const v5 = await formVals();
check('URL 参数整体优先于旧保存状态（不合并）', v5.province === '湖南省' && v5.season === '', JSON.stringify(v5));

// 6. 非法参数：不异常、按空处理、URL 被清洗
await page.goto(BASE + '/#/discover?province=' + encodeURIComponent('不存在的省') + '&theme=nope&season=bad');
await page.waitForSelector('#discover-results .dest-card');
const v6 = await formVals();
const url6 = await page.evaluate(() => location.hash);
check('非法参数按空处理且不异常', v6.province === '' && v6.theme === '' && v6.season === '' && (await cardCount()) === 30, JSON.stringify(v6));
check('非法参数从 URL 中被清洗', !url6.includes('不存在') && !url6.includes('nope') && !url6.includes('bad'), url6);

// 7. 输入关键词后 URL 同步更新
await page.goto(BASE + '/#/discover');
await page.waitForSelector('#discover-form');
await page.fill('#f-keyword', '黄山');
await page.waitForTimeout(700);
const url7 = await page.evaluate(() => location.hash);
check('输入关键词后 URL 同步更新', url7.includes(encodeURIComponent('黄山')), url7);

// 8. 前进后退恢复相应状态
await page.goto(BASE + '/#/discover');
await page.waitForSelector('#discover-form');
await page.selectOption('#f-province', '湖南省');
await page.waitForTimeout(300);
await page.selectOption('#f-season', 'autumn');
await page.waitForTimeout(300);
await page.goBack();
await page.waitForSelector('#discover-form');
await page.waitForTimeout(300);
const vBack = await formVals();
check('后退恢复上一筛选状态', vBack.province === '湖南省' && vBack.season === '', JSON.stringify(vBack));
await page.goForward();
await page.waitForSelector('#discover-form');
await page.waitForTimeout(300);
const vFwd = await formVals();
check('前进恢复下一筛选状态', vFwd.province === '湖南省' && vFwd.season === 'autumn', JSON.stringify(vFwd));

// 9. 清除筛选：URL 回到无参、结果恢复 30 条
await page.fill('#f-keyword', '不存在的目的地xyz');
await page.waitForTimeout(700);
await page.waitForSelector('[data-clear-filters]');
await page.click('[data-clear-filters]');
await page.waitForTimeout(300);
const url9 = await page.evaluate(() => location.hash);
check('清除筛选后 URL 回到无参且结果恢复', url9 === '#/discover' && (await cardCount()) === 30, url9);

check('全程无未捕获页面错误', errs.length === 0, errs.join(' | '));
console.log('URL-SYNC SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed (' + KIND + ')');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
