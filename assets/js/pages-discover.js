(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  CTA.pages.discover = async function (el, params) {
    const esc = CTA.ui.esc;
    /* 离开发现页时移除上一轮的滚动监听，避免重复绑定。 */
    if (CTA._discScrollCleanup) { CTA._discScrollCleanup(); CTA._discScrollCleanup = null; }
    /* 进入来源决定初始筛选：带 URL 参数（首页 chip 等显式入口）优先；否则恢复上次保存的状态。 */
    const hasParams = ['keyword', 'province', 'theme', 'season'].some(k => params && params[k]);
    const saved = hasParams ? null : CTA.store.getDiscoverState();
    const init = {
      keyword: (params && params.keyword) || (saved && saved.keyword) || '',
      province: (params && params.province) || (saved && saved.province) || '',
      theme: (params && params.theme) || (saved && saved.theme) || '',
      season: (params && params.season) || (saved && saved.season) || '',
    };
    el.innerHTML =
      '<h2>发现目的地</h2>' +
      '<form id="discover-form" class="filter-form">' +
      '<label>关键词<input type="search" id="f-keyword" placeholder="目的地 / 省 / 市" value="' + esc(init.keyword) + '"></label>' +
      '<label>省份<select id="f-province"><option value="">全部</option></select></label>' +
      '<label>主题<select id="f-theme"><option value="">全部</option></select></label>' +
      '<label>适宜季节<select id="f-season"><option value="">全部</option><option value="spring">春季</option><option value="summer">夏季</option><option value="autumn">秋季</option><option value="winter">冬季</option></select></label>' +
      '<button type="submit">筛选</button></form>' +
      '<div id="discover-results"><p class="muted">加载中…</p></div>';
    const results = el.querySelector('#discover-results');
    let index = [];
    try {
      const [idx, themesDoc, provincesDoc] = await Promise.all([
        CTA.dataService.loadIndex(), CTA.dataService.loadThemes(), CTA.dataService.loadProvinces(),
      ]);
      index = idx;
      const provSel = el.querySelector('#f-province');
      provincesDoc.provinces.forEach(p => {
        const o = document.createElement('option'); o.value = p.name; o.textContent = p.name;
        if (init.province === p.name) o.selected = true; provSel.appendChild(o);
      });
      const themeSel = el.querySelector('#f-theme');
      themesDoc.themes.forEach(t => {
        const o = document.createElement('option'); o.value = t.id; o.textContent = t.label;
        if (init.theme === t.id) o.selected = true; themeSel.appendChild(o);
      });
      const seasonSel = el.querySelector('#f-season');
      if (init.season) seasonSel.value = init.season;
    } catch (e) {
      results.innerHTML = CTA.ui.errorBox('DATA_LOAD_FAILED');
      return;
    }
    const kwEl = el.querySelector('#f-keyword');
    function currentFilters() {
      return {
        keyword: kwEl.value,
        province: el.querySelector('#f-province').value,
        theme: el.querySelector('#f-theme').value,
        season: el.querySelector('#f-season').value,
      };
    }
    function persist() { CTA.store.setDiscoverState(currentFilters()); }
    function render() {
      const filters = currentFilters();
      let list = CTA.dataService.searchDestinations(index, filters.keyword);
      list = CTA.dataService.filterDestinations(list, filters);
      results.innerHTML = list.length
        ? '<p class="muted">共 ' + list.length + ' 个目的地</p><div class="card-grid">' + list.map(CTA.ui.destCard).join('') + '</div>'
        : CTA.ui.emptyState('没有符合条件的目的地', '试试清除某个筛选条件，或等待更多目的地发布。') +
          '<p><button type="button" class="btn" data-clear-filters>清除全部筛选</button></p>';
    }
    el.querySelector('#discover-form').addEventListener('submit', function (e) { e.preventDefault(); render(); persist(); });
    ['#f-province', '#f-theme', '#f-season'].forEach(sel => {
      el.querySelector(sel).addEventListener('change', persist);
    });
    /* 关键词输入即时筛选（200ms 去抖），不必每次都按“筛选”；回车提交仍立即渲染 */
    let kwTimer = null;
    kwEl.addEventListener('input', function () {
      persist();
      if (kwTimer) clearTimeout(kwTimer);
      kwTimer = setTimeout(function () { kwTimer = null; render(); }, 200);
    });
    results.addEventListener('click', function (e) {
      if (!e.target.closest('[data-clear-filters]')) return;
      kwEl.value = '';
      el.querySelector('#f-province').value = '';
      el.querySelector('#f-theme').value = '';
      el.querySelector('#f-season').value = '';
      render(); persist();
    });
    render();
    persist();
    /* 滚动位置保存：仅在发现页路由下记录；滚动停稳 150ms 后才写入，
       避免点击卡片前的瞬时滚动（如浏览器将元素滚入视野）覆盖离开前的位置。 */
    let settleTimer = null;
    const onScroll = function () {
      if (!location.hash.startsWith('#/discover')) return;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        settleTimer = null;
        if (location.hash.startsWith('#/discover')) CTA.store.setDiscoverState({ scrollY: window.scrollY });
      }, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    CTA._discScrollCleanup = function () {
      window.removeEventListener('scroll', onScroll);
      if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
    };
    /* 恢复滚动：列表渲染后两帧执行，覆盖路由的初始 scrollTo(0,0)；仅恢复保存值，不影响其他页面。 */
    if (saved && saved.scrollY > 0) {
      requestAnimationFrame(function () { requestAnimationFrame(function () { window.scrollTo(0, saved.scrollY); }); });
    }
  };
})();
