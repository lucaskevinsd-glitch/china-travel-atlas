/*
 * 相关目的地专项（B5 更新）：详情页三层关联推荐区（M1 附近 / M2 相似 / M3 延伸）出现、
 * 不含自身、链接有效、点击可进入对应详情；弱匹配不凑数（亚龙湾 M1 隐藏、M2 仅 2 张）。
 * 运行：node tests/e2e/related.mjs（本地服务 8130，Firefox）。
 */
import { firefox } from 'playwright-core';
const BASE = 'http://127.0.0.1:8130/';
const results = [];
function check(name, ok, extra = '') { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); }
const browser = await firefox.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(BASE + '#/dest/zhangjiajie-national-forest-park');
await page.waitForSelector('#rec-section:not([hidden])', { timeout: 8000 });
const cards = await page.locator('#rec-section .dest-card').count();
check('推荐区显示卡片', cards > 0, String(cards));
const hrefs = await page.evaluate(() => [...document.querySelectorAll('#rec-section .dest-card .card-link')].map(a => a.getAttribute('href')));
check('推荐不含自身', !hrefs.some(h => h.includes('zhangjiajie')));
check('推荐链接均为目的地路由', hrefs.every(h => h.startsWith('#/dest/')), hrefs.join(','));
check('三层之间无重复', new Set(hrefs).size === hrefs.length, hrefs.join(','));
await page.click('[data-rec-nearby] .dest-card .card-link >> nth=0');
await page.waitForTimeout(700);
check('点击推荐可进入对应详情', await page.evaluate(() => location.hash.startsWith('#/dest/') && !!document.querySelector('article.detail h2')));
await page.goto(BASE + '#/dest/yalong-bay');
await page.waitForSelector('#rec-section:not([hidden])', { timeout: 8000 });
const m1Hidden = await page.evaluate(() => document.querySelector('[data-rec-nearby]').hidden);
const yCards = await page.locator('[data-rec-similar] .dest-card').count();
const yHref = await page.evaluate(() => document.querySelector('[data-rec-similar] .dest-card .card-link')?.getAttribute('href'));
check('弱匹配不填满：亚龙湾 M1 隐藏、M2 仅 2 张（鼓浪屿/青岛）', m1Hidden && yCards === 2 && yHref.includes('gulangyu'), 'M1隐藏=' + m1Hidden + ' M2=' + yCards + ' ' + yHref);
check('全程无未捕获页面错误', errs.length === 0, errs.join(';').slice(0, 160));
console.log('RELATED SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed (firefox)');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
