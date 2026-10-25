(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  CTA.pages.discover = async function (el, params) {
    const esc = CTA.ui.esc;
    /* 离开发现页时移除上一轮的滚动监听，避免重复绑定。 */
    if (CTA._discScrollCleanup) { CTA._discScrollCleanup(); CTA._discScrollCleanup = null; }
    /* 筛选 URL 同步：可分享状态的唯一来源是 URL，优先级为——
       ①前进/后退恢复的历史状态（history.state，本页 pushState/replaceState 写入）；
       ②URL 参数（分享链接、首页 chip、首页搜索等显式入口）；
       ③localStorage 保存的上次状态（无参数、无历史状态时）。
       这样 URL 与页面状态一致，且后退不会被后来 persist 的 localStorage 静默覆盖。
       注意：发现页实际筛选项只有 keyword/province/theme/season 四项（数据模型里的 type
       没有对应的筛选控件，不编造 type 参数）。 */
    const FILTER_KEYS = ['keyword', 'province', 'theme', 'season'];
    function pickFilters(obj) {
      const out = {};
      FILTER_KEYS.forEach(k => { out[k] = (obj && typeof obj[k] === 'string') ? obj[k] : ''; });
      return out;
    }
    const navState = (history.state && typeof history.state === 'object' &&
      FILTER_KEYS.some(k => typeof history.state[k] === 'string')) ? pickFilters(history.state) : null;
    const hasParams = FILTER_KEYS.some(k => params && params[k]);
    const saved = CTA.store.getDiscoverState();
    const init = navState || (hasParams ? pickFilters(params) : pickFilters(saved));
    const scrollSource = navState ? 'history' : (hasParams ? 'params' : 'saved');
    function buildQuery(f) {
      const q = new URLSearchParams();
      FILTER_KEYS.forEach(k => { if (f[k]) q.set(k, f[k]); });
      const s = q.toString();
      return s ? '?' + s : '';
    }
    /* 同步 URL 与历史状态：离散改动（下拉、提交、清除）用 pushState，产生可后退的历史条目；
       连续输入（关键词去抖）用 replaceState，只更新当前条目，不刷屏历史记录。
       pushState/replaceState 均不触发 hashchange，不会引起路由重渲染循环。
       hash 已等于目标时仍 replaceState，确保 history.state 与筛选值一致。 */
    function syncUrl(f, mode) {
      const target = '#/discover' + buildQuery(f);
      if (location.hash === target) { history.replaceState(f, '', target); return; }
      if (mode === 'push') history.pushState(f, '', target);
      else history.replaceState(f, '', target);
    }
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
      /* 非法参数清洗：省份、主题须在已知列表内，季节须为四季之一；非法值按空处理，
         并用 replaceState 把清洗后的状态写回 URL（不产生新历史条目，不重渲染）。 */
      const clean = {
        keyword: init.keyword,
        province: provincesDoc.provinces.some(p => p.name === init.province) ? init.province : '',
        theme: themesDoc.themes.some(t => t.id === init.theme) ? init.theme : '',
        season: ['spring', 'summer', 'autumn', 'winter'].indexOf(init.season) !== -1 ? init.season : '',
      };
      if (JSON.stringify(clean) !== JSON.stringify(init)) {
        Object.assign(init, clean);
        el.querySelector('#f-keyword').value = clean.keyword;
        provSel.value = clean.province;
        themeSel.value = clean.theme;
        seasonSel.value = clean.season;
        syncUrl(clean, 'replace');
      }
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
    el.querySelector('#discover-form').addEventListener('submit', function (e) { e.preventDefault(); render(); persist(); syncUrl(currentFilters(), 'push'); });
    /* 下拉改动即时渲染并入历史（与关键词即时筛选一致；URL 始终与结果集对应）。 */
    ['#f-province', '#f-theme', '#f-season'].forEach(sel => {
      el.querySelector(sel).addEventListener('change', function () { render(); persist(); syncUrl(currentFilters(), 'push'); });
    });
    /* 关键词输入即时筛选（200ms 去抖），不必每次都按“筛选”；回车提交仍立即渲染 */
    let kwTimer = null;
    kwEl.addEventListener('input', function () {
      persist();
      if (kwTimer) clearTimeout(kwTimer);
      kwTimer = setTimeout(function () { kwTimer = null; render(); syncUrl(currentFilters(), 'replace'); }, 200);
    });
    results.addEventListener('click', function (e) {
      if (!e.target.closest('[data-clear-filters]')) return;
      kwEl.value = '';
      el.querySelector('#f-province').value = '';
      el.querySelector('#f-theme').value = '';
      el.querySelector('#f-season').value = '';
      render(); persist(); syncUrl(currentFilters(), 'push');
    });
    render();
    persist();
    /* 无参数进入时把 localStorage 恢复的状态规范化进 URL，使复制当前链接即可分享筛选结果。 */
    if (scrollSource === 'saved') syncUrl(currentFilters(), 'replace');
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
    /* 恢复滚动：列表渲染后两帧执行，覆盖路由的初始 scrollTo(0,0)。
       仅在保存状态与历史状态来源下恢复；直接打开分享链接（URL 参数来源）时不恢复旧滚动位置。 */
    if (saved && saved.scrollY > 0 && scrollSource !== 'params') {
      requestAnimationFrame(function () { requestAnimationFrame(function () { window.scrollTo(0, saved.scrollY); }); });
    }
  };
})();
