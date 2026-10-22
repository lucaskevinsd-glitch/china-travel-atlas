(function () {
  function buildNav() {
    const cfg = CTA.config;
    const nav = document.getElementById('top-nav');
    const tabs = document.getElementById('bottom-tabs');
    nav.innerHTML = cfg.nav.map(n => '<a data-route="' + n.id + '" href="' + n.route + '">' + n.icon + ' ' + n.label + '</a>').join('');
    tabs.innerHTML = cfg.tabs.map(n => '<a data-route="' + n.id + '" href="' + n.route + '"><span class="tab-icon">' + n.icon + '</span>' + n.label + '</a>').join('');
    const offline = document.getElementById('offline-tip');
    function syncOffline() { offline.hidden = navigator.onLine; }
    window.addEventListener('online', syncOffline);
    window.addEventListener('offline', syncOffline);
    syncOffline();
  }
  document.addEventListener('DOMContentLoaded', async function () {
    buildNav();
    window.addEventListener('hashchange', CTA.router.render);
    try { await CTA.dataService.loadThemes(); } catch (e) { /* 主题标签加载失败时回退显示 id */ }
    CTA.router.render();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* SW 注册失败不影响使用 */ });
    }
  });
})();
