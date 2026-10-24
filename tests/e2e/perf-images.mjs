/*
 * 图片性能测量（本地回环，冷缓存）：统计图片请求数/字节（按本地文件大小计）与首图完成时间。
 * 用法：CTA_PERF_BASE=http://127.0.0.1:8130 node perf-images.mjs <label>
 * 环境说明：本机回环、无网络节流，绝对时间仅用于同环境前后对比，不代表真实移动网络。
 */
import { firefox } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const BASE = process.env.CTA_PERF_BASE || 'http://127.0.0.1:8130';
const SITE = process.env.CTA_PERF_SITE || '/tmp/cta-perf-site';
const label = process.argv[2] || 'run';
const browser = await firefox.launch();
async function measure(route, settleMs) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const imgs = [];
  page.on('response', r => { const u = r.url(); if (/\.(webp|jpe?g|png)(\?|$)/.test(u)) imgs.push(new URL(u).pathname); });
  await page.goto(BASE + '/' + route);
  await page.waitForTimeout(settleMs);
  const timing = await page.evaluate(() => {
    const rs = performance.getEntriesByType('resource').filter(e => /\.(webp|jpe?g|png)/.test(e.name));
    return rs.length ? Math.round(Math.min(...rs.map(e => e.responseEnd))) : null;
  });
  let bytes = 0;
  for (const p of imgs) { try { bytes += fs.statSync(path.join(SITE, decodeURIComponent(p))).size; } catch {} }
  console.log(JSON.stringify({ label, route, imgRequests: imgs.length, imgBytesKB: Math.round(bytes / 1024), firstImgDoneMs: timing }));
  await ctx.close();
}
await measure('#/', 2500);
await measure('#/discover', 2500);
await measure('#/dest/zhangjiajie-national-forest-park', 2500);
await browser.close();
