/* Hash 路由：#/ 首页，#/discover，#/dest/<id>，#/planner，#/favorites。未知路由显示未找到页，不白屏。 */
(function () {
  window.CTA = window.CTA || {};
  function parseHash() {
    const raw = (location.hash || '#/').slice(1);
    const qIdx = raw.indexOf('?');
    const path = qIdx === -1 ? raw : raw.slice(0, qIdx);
    const params = {};
    if (qIdx !== -1) new URLSearchParams(raw.slice(qIdx + 1)).forEach((v, k) => { params[k] = v; });
    const parts = path.split('/').filter(Boolean);
    return { parts, params };
  }
  function setActive(routeId) {
    document.querySelectorAll('[data-route]').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-route') === routeId);
    });
  }
  async function render() {
    const main = document.getElementById('app');
    const { parts, params } = parseHash();
    window.scrollTo(0, 0);
    try {
      if (parts.length === 0) { setActive('home'); await CTA.pages.home(main); }
      else if (parts[0] === 'discover') { setActive('discover'); await CTA.pages.discover(main, params); }
      else if (parts[0] === 'dest' && parts[1]) { setActive('discover'); await CTA.pages.detail(main, { id: decodeURIComponent(parts[1]) }); }
      else if (parts[0] === 'planner') { setActive('planner'); await CTA.pages.planner(main, params); }
      else if (parts[0] === 'favorites') { setActive('favorites'); await CTA.pages.favorites(main); }
      else {
        setActive('');
        main.innerHTML = '<h2>页面未找到</h2>' + CTA.ui.errorBox('DATA_NOT_FOUND') + '<p><a href="#/">返回首页</a></p>';
      }
    } catch (e) {
      main.innerHTML = '<h2>加载失败</h2>' + CTA.ui.errorBox('UNKNOWN');
      if (window.console) console.error(e);
    }
  }
  CTA.router = { render, parseHash };
})();
