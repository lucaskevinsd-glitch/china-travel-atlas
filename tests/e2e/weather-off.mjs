/*
 * 天气关闭降级测试：夹具站点将 CTA.config.features.weatherEnabled 置为 false，
 * 断言详情页主体完整渲染、天气区明确显示不可用、收藏与规划入口可用、无页面错误。
 * 夹具：CTA_FIXTURE（默认 /tmp/cta-wxoff-site，含 published 测试记录与色块图，config 已关天气）；
 * 需先以该目录启动 http.server 8126。Firefox 真实 HTTP 运行。
 */
import { firefox } from 'playwright-core';
const BASE = 'http://127.0.0.1:8126';
const results = [];
function check(name, ok, extra = '') { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); }
const browser = await firefox.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(BASE + '/#/dest/zhangjiajie-national-forest-park');
await page.waitForSelector('article.detail h2');
await page.waitForTimeout(400);
const t = await page.textContent('article.detail');
check('天气关闭时详情标题与简介完整', t.includes('张家界国家森林公园') && t.includes('石英砂岩峰柱'));
check('天气关闭时明确显示不可用', t.includes('天气暂不可用'));
check('天气关闭时收藏按钮可用', (await page.locator('.fav-btn').count()) === 1);
await page.click('.fav-btn');
check('天气关闭时收藏操作生效', (await page.textContent('.fav-btn')).includes('已收藏'));
check('天气关闭时规划入口存在', (await page.locator('a[href*="#/planner"]').count()) >= 1);
check('全程无未捕获页面错误', errs.length === 0, errs.join(';').slice(0, 200));
console.log('WEATHER-OFF SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
