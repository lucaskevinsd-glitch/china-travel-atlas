(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  CTA.pages.discover = async function (el, params) {
    const esc = CTA.ui.esc;
    el.innerHTML =
      '<h2>发现目的地</h2>' +
      '<form id="discover-form" class="filter-form">' +
      '<label>关键词<input type="search" id="f-keyword" placeholder="目的地 / 省 / 市" value="' + esc(params.keyword || '') + '"></label>' +
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
        if (params.province === p.name) o.selected = true; provSel.appendChild(o);
      });
      const themeSel = el.querySelector('#f-theme');
      themesDoc.themes.forEach(t => {
        const o = document.createElement('option'); o.value = t.id; o.textContent = t.label;
        if (params.theme === t.id) o.selected = true; themeSel.appendChild(o);
      });
      const seasonSel = el.querySelector('#f-season');
      if (params.season) seasonSel.value = params.season;
    } catch (e) {
      results.innerHTML = CTA.ui.errorBox('DATA_LOAD_FAILED');
      return;
    }
    function render() {
      const filters = {
        province: el.querySelector('#f-province').value,
        theme: el.querySelector('#f-theme').value,
        season: el.querySelector('#f-season').value,
      };
      let list = CTA.dataService.searchDestinations(index, el.querySelector('#f-keyword').value);
      list = CTA.dataService.filterDestinations(list, filters);
      results.innerHTML = list.length
        ? '<p class="muted">共 ' + list.length + ' 个目的地</p><div class="card-grid">' + list.map(CTA.ui.destCard).join('') + '</div>'
        : CTA.ui.emptyState('没有符合条件的目的地', '试试清除某个筛选条件，或等待更多目的地发布。');
    }
    el.querySelector('#discover-form').addEventListener('submit', function (e) { e.preventDefault(); render(); });
    render();
  };
})();
