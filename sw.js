/* China Travel Atlas — Service Worker
 * 导航请求 network-first；CSS/JS/JSON 带 ?v= 版本号 cache-first；天气等跨域请求不拦截。
 * 改任何静态资源必须同步递增 VERSION 与 AV（与 index.html、config.js 的 assetV 一致）。 */
const VERSION = 'cta-v1-20261022b';
const AV = '20261022b';
const CORE = [
  './assets/css/main.css?v=' + AV,
  './assets/js/config.js?v=' + AV, './assets/js/errors.js?v=' + AV, './assets/js/store.js?v=' + AV,
  './assets/js/ui.js?v=' + AV, './assets/js/data-service.js?v=' + AV,
  './assets/js/services/weather-service.js?v=' + AV, './assets/js/services/planner-service.js?v=' + AV,
  './assets/js/pages-home.js?v=' + AV, './assets/js/pages-discover.js?v=' + AV,
  './assets/js/pages-detail.js?v=' + AV, './assets/js/pages-planner.js?v=' + AV,
  './assets/js/pages-favorites.js?v=' + AV, './assets/js/router.js?v=' + AV, './assets/js/app.js?v=' + AV,
  './manifest.json',
];
const DATA = [
  './data/provinces.json?v=' + AV, './data/themes.json?v=' + AV,
  './data/destinations-index.json?v=' + AV, './data/meta.json?v=' + AV,
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll([...CORE, ...DATA])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)).catch(() => {}); }
        return res;
      }).catch(async () => {
        const cached = await caches.match('./index.html') || await caches.match('./');
        if (cached) return cached;
        return new Response('China Travel Atlas 离线：请检查网络连接后重试', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      })
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
