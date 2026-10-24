/*
 * Service Worker 离线专项（Firefox，真实 http.server 8125，context.setOffline 为浏览器级断网）：
 * A 在线：SW 安装激活、预缓存含 planner-edit.js、生成 3 天草案；
 * B 离线：重开首页/详情/规划页、行程编辑与刷新恢复、详情图片状态如实记录；
 * C 恢复联网并升级缓存版本：旧缓存清理、新缓存生效。
 * 夹具：CTA_FIXTURE（默认 /tmp/cta-state-site）。注意：本测试在 C 阶段会改写夹具版本号，仅用于测试。
 */
import { firefox } from 'playwright-core';
import { execSync } from 'node:child_process';
const FIXTURE = process.env.CTA_FIXTURE || '/tmp/cta-state-site';
const BASE = 'http://127.0.0.1:8125';
const results = [];
function check(name, ok, extra = '') { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); }
const browser = await firefox.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));

// A 在线
await page.goto(BASE + '/#/planner');
await page.waitForSelector('#plan-form');
await page.evaluate(async () => { await navigator.serviceWorker.ready; });
const swState = await page.evaluate(async () => {
  const keys = await caches.keys();
  const cache = await caches.open('cta-v1-20261024d');
  const hasEdit = !!(await cache.match('./assets/js/services/planner-edit.js?v=20261024d'));
  const hasCore = !!(await cache.match('./assets/js/config.js?v=20261024d'));
  const hasData = !!(await cache.match('./data/destinations-index.json?v=20261024d'));
  return { keys, hasEdit, hasCore, hasData };
});
check('SW 已安装激活且缓存键为当前版本', swState.keys.includes('cta-v1-20261024d'), swState.keys.join(','));
check('预缓存含 planner-edit.js（路径与版本一致）', swState.hasEdit);
check('预缓存含核心脚本与索引数据', swState.hasCore && swState.hasData);
await page.fill('#p-date', '2026-11-02');
await page.fill('#p-days', '3');
await page.click('#plan-form button[type="submit"]');
await page.waitForSelector('#plan-list li');
check('在线生成 3 天草案', (await page.locator('#plan-list li').count()) === 3);
// 在线访问详情一次（图片走网络加载，记录 naturalWidth）
await page.goto(BASE + '/#/dest/zhangjiajie-national-forest-park');
await page.waitForSelector('.detail h2, article.detail h2', { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(800);
const onlineImg = await page.evaluate(() => { const img = document.querySelector('.detail img, article img'); return img ? img.naturalWidth : -1; });

// B 离线
await ctx.setOffline(true);
await page.goto(BASE + '/#/');
await page.waitForTimeout(1000);
check('离线重开首页仍渲染', (await page.textContent('#app')).includes('China Travel Atlas') || (await page.locator('.dest-card').count()) > 0, 'cards=' + await page.locator('.dest-card').count());
await page.goto(BASE + '/#/planner');
await page.waitForSelector('#plan-list li', { timeout: 8000 });
check('离线重开规划页且草案恢复', (await page.locator('#plan-list li').count()) === 3);
const beforeEdit = await page.evaluate(() => [...document.querySelectorAll('#plan-list li')].map(li => li.textContent.split('：')[1] || ''));
await page.click('button[data-act="up"][data-i="1"]');
await page.waitForTimeout(300);
const afterEdit = await page.evaluate(() => [...document.querySelectorAll('#plan-list li')].map(li => li.textContent.split('：')[1] || ''));
check('离线行程编辑按钮工作（上移交换）', beforeEdit[0] !== afterEdit[0] && afterEdit[0].includes(beforeEdit[1].slice(0, 6)), beforeEdit.join('|') + ' -> ' + afterEdit.join('|'));
await page.reload();
await page.waitForSelector('#plan-list li', { timeout: 8000 });
const afterReload = await page.evaluate(() => [...document.querySelectorAll('#plan-list li')].map(li => li.textContent.split('：')[1] || ''));
check('离线刷新后编辑结果仍在（localStorage 草案）', afterReload.join('|') === afterEdit.join('|'));
await page.goto(BASE + '/#/dest/zhangjiajie-national-forest-park');
await page.waitForTimeout(1000);
const offlineTitle = await page.textContent('#app').catch(() => '');
const offlineImg = await page.evaluate(() => { const img = document.querySelector('.detail img, article img'); return img ? img.naturalWidth : -1; });
check('离线详情页标题仍渲染', offlineTitle.includes('张家界'), offlineTitle.slice(0, 40));
console.log('INFO 离线详情图片 naturalWidth=' + offlineImg + '（在线时=' + onlineImg + '；图片不在 SW 预缓存内，离线显示依赖浏览器 HTTP 缓存）');

// C 恢复联网 + 版本升级
await ctx.setOffline(false);
execSync(`grep -rl '20261024d' ${FIXTURE}/index.html ${FIXTURE}/assets/js/config.js ${FIXTURE}/sw.js | xargs sed -i 's/20261024d/20261024e/g'`);
await page.goto(BASE + '/#/');
await page.waitForTimeout(500);
await page.reload();
try {
  await page.waitForFunction(async () => (await caches.keys()).includes('cta-v1-20261024e'), { timeout: 10000 });
} catch { /* 超时则以实际 keys 为准 */ }
await page.waitForTimeout(1000);
const keysAfter = await page.evaluate(() => caches.keys());
check('版本升级后旧缓存已清理、新缓存生效', keysAfter.includes('cta-v1-20261024e') && !keysAfter.includes('cta-v1-20261024d'), keysAfter.join(','));
const newEdit = await page.evaluate(async () => { const c = await caches.open('cta-v1-20261024e'); return !!(await c.match('./assets/js/services/planner-edit.js?v=20261024e')); });
check('新缓存含新版 planner-edit.js，无旧版脚本混用', newEdit);
check('全程无未捕获页面错误', errs.length === 0, errs.join(' | '));

console.log('SW-OFFLINE SUMMARY: ' + results.filter(Boolean).length + '/' + results.length + ' passed (firefox)');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
