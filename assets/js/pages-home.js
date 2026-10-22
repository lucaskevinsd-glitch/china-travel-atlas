(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  CTA.pages.home = async function (el) {
    el.innerHTML = '<h2>发现中国值得去的地方</h2><p class="muted">按自然风景、季节与主题找目的地，再生成你的行程草案。</p><div id="home-body"><p class="muted">加载中…</p></div>';
    const body = el.querySelector('#home-body');
    try {
      const [index, themesDoc, provincesDoc, meta] = await Promise.all([
        CTA.dataService.loadIndex(), CTA.dataService.loadThemes(), CTA.dataService.loadProvinces(), CTA.dataService.loadMeta(),
      ]);
      const esc = CTA.ui.esc;
      let html = '';
      html += '<section><h3>旅行主题</h3><div class="chip-row big">' +
        themesDoc.themes.map(t => '<a class="chip link-chip" href="#/discover?theme=' + encodeURIComponent(t.id) + '">' + esc(t.label) + '</a>').join('') + '</div></section>';
      html += '<section><h3>按省份浏览</h3><div class="chip-row big">' +
        provincesDoc.provinces.map(p => '<a class="chip link-chip" href="#/discover?province=' + encodeURIComponent(p.name) + '">' + esc(p.name) + '</a>').join('') + '</div></section>';
      html += '<section><h3>已发布目的地（' + index.length + '）</h3>';
      html += index.length
        ? '<div class="card-grid">' + index.slice(0, 6).map(CTA.ui.destCard).join('') + '</div>'
        : CTA.ui.emptyState('目的地数据正在核验录入中', '首批目的地经来源与坐标核验后才会发布，当前没有已发布条目。数据更新：' + esc(meta.updated || ''));
      html += '</section>';
      body.innerHTML = html;
    } catch (e) {
      body.innerHTML = CTA.ui.errorBox('DATA_LOAD_FAILED');
    }
  };
})();
