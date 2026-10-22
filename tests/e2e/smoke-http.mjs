/*
 * 真实浏览器冒烟测试（Chromium + playwright-core）。选择器以 assets/js/pages-*.js 实际实现为准。
 * 真实 HTTP 版本：Firefox（Playwright 官方构建）直接访问 python http.server 的 http://127.0.0.1:8124，
 * 站点文件不经任何拦截（仅天气 API 请求被 abort 以模拟失败）。Chromium 在本沙箱被 LNA 检查拦截回环地址，见 smoke.mjs 头注。
 * 环境变量：CTA_FIXTURE（夹具目录，默认 /tmp/cta-e2e-site）、CTA_CHROME（默认 /opt/meta-chromium/chrome）。
 * 注意：夹具站点含 1 条测试用 published 记录（色块图，明确标注 fixture），不在正式仓库数据内；
 * 运行前夹具的全图文件已被故意删除，用于验证破图降级。
 */
import { firefox } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://127.0.0.1:8124';
const EXE = process.env.CTA_CHROME || '/opt/meta-chromium/chrome';
const FIXTURE = process.env.CTA_FIXTURE || '/tmp/cta-e2e-site';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };
async function serveFixture(route) {
  const url = new URL(route.request().url());
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(FIXTURE, rel);
  if (!file.startsWith(FIXTURE)) return route.fulfill({ status: 403, body: 'forbidden' });
  try {
    const body = await readFile(file);
    return route.fulfill({ status: 200, body, contentType: MIME[path.extname(file)] || 'application/octet-stream' });
  } catch { return route.fulfill({ status: 404, body: 'not found' }); }
}

const results = [];
function check(name, ok, extra = '') {
  results.push({ name, ok, extra });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''));
}

const browser = await firefox.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));
await page.route('**api.open-meteo.com**', r => r.abort()); // 天气请求全部失败，验证降级

await page.goto(BASE + '/#/');
await page.waitForSelector('.topbar');
await page.waitForSelector('#home-body .dest-card');
check('首页打开并渲染已发布目的地卡片', (await page.textContent('#app')).includes('张家界国家森林公园'));

// 首页省份 chip -> 发现页（带 province 参数）
await page.click('a.chip[href*="province=%E6%B9%96%E5%8D%97%E7%9C%81"]');
await page.waitForSelector('#discover-results .dest-card');
check('省份 chip 跳转发现页且结果为 1 条', (await page.textContent('#discover-results')).includes('共 1 个目的地'));

// 关键词搜索
await page.fill('#f-keyword', '不存在的地名xyz');
await page.click('#discover-form button[type="submit"]');
await page.waitForTimeout(150);
check('关键词无匹配显示空状态', (await page.textContent('#discover-results')).includes('没有符合条件的目的地'));
await page.fill('#f-keyword', '张家界');
await page.click('#discover-form button[type="submit"]');
await page.waitForTimeout(150);
check('关键词命中恢复 1 条', (await page.textContent('#discover-results')).includes('共 1 个目的地'));

// 省份筛选无结果
await page.selectOption('#f-province', '四川省');
await page.click('#discover-form button[type="submit"]');
await page.waitForTimeout(150);
check('省份筛选无结果显示空状态', (await page.textContent('#discover-results')).includes('没有符合条件的目的地'));
await page.selectOption('#f-province', '');
await page.click('#discover-form button[type="submit"]');
await page.waitForSelector('#discover-results .dest-card');

// 进详情（天气被拦截应降级）
await page.click('.dest-card a.card-link');
await page.waitForSelector('article.detail h2');
check('详情页标题正确', (await page.textContent('article.detail h2')).includes('张家界国家森林公园'));
await page.waitForFunction(() => document.querySelector('#weather-box').textContent.includes('天气暂不可用'), null, { timeout: 8000 }).catch(() => {});
check('天气加载失败显示不可用提示且页面不崩溃', (await page.textContent('#weather-box')).includes('天气暂不可用'));

// 破图降级：夹具全图已删除，hero 不应显示破图图标
const heroState = await page.evaluate(() => {
  const img = document.querySelector('img.detail-hero');
  if (!img) return 'no-img';
  if (img.style.display === 'none' || !img.isConnected) return 'hidden';
  return img.complete && img.naturalWidth === 0 ? 'broken-visible' : 'loaded';
});
check('图片加载失败时不显示破图（隐藏处理）', heroState === 'hidden' || heroState === 'no-img', 'heroState=' + heroState);

// 收藏（详情页按钮）-> 收藏页
await page.click('article.detail .fav-btn');
await page.goto(BASE + '/#/favorites');
await page.waitForTimeout(300);
check('收藏页出现已收藏目的地', (await page.textContent('#fav-body')).includes('张家界国家森林公园'));

// 规划
await page.goto(BASE + '/#/planner');
await page.waitForSelector('#plan-form');
const start = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
await page.fill('#p-from', '长沙');
await page.fill('#p-date', start);
await page.fill('#p-days', '3');
await page.selectOption('#p-theme', 'nature');
await page.click('#plan-form button[type="submit"]');
await page.waitForTimeout(300);
const planText = await page.textContent('#plan-result');
check('规划生成 3 天草案且包含目的地', planText.includes('行程草案（3 天') && planText.includes('张家界国家森林公园'));

// 移动端溢出
const mob = await browser.newContext({ viewport: { width: 375, height: 700 } });
const mp = await mob.newPage();
mp.on('pageerror', e => pageErrors.push('mobile: ' + String(e)));
await mp.route('**api.open-meteo.com**', r => r.abort());
for (const hash of ['#/', '#/discover', '#/dest/zhangjiajie-national-forest-park', '#/planner', '#/favorites']) {
  await mp.goto(BASE + '/' + hash);
  await mp.waitForTimeout(400);
  const sw = await mp.evaluate(() => document.documentElement.scrollWidth);
  check('移动端 375px 无横向溢出 ' + hash, sw <= 376, 'scrollWidth=' + sw);
}

check('全程无未捕获页面错误', pageErrors.length === 0, pageErrors.join('; ').slice(0, 300));
await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`SMOKE SUMMARY: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
