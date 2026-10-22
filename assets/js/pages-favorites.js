(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  CTA.pages.favorites = async function (el) {
    el.innerHTML = '<h2>我的收藏</h2><div id="fav-body"><p class="muted">加载中…</p></div>';
    const body = el.querySelector('#fav-body');
    const favIds = CTA.store.getFavorites();
    if (!favIds.length) { body.innerHTML = CTA.ui.emptyState('还没有收藏', '在发现页或详情页点“收藏”即可把目的地存到这里（保存在本机浏览器）。'); return; }
    try {
      const index = await CTA.dataService.loadIndex();
      const list = index.filter(d => favIds.indexOf(d.id) !== -1);
      const missing = favIds.filter(id => !index.some(d => d.id === id));
      body.innerHTML = (list.length
        ? '<div class="card-grid">' + list.map(CTA.ui.destCard).join('') + '</div>'
        : CTA.ui.emptyState('收藏的目的地尚未发布', '收藏记录仍保存在本机，待目的地发布后会自动出现在这里。')) +
        (missing.length ? '<p class="muted">另有 ' + missing.length + ' 条收藏对应的目的地当前未发布。</p>' : '');
    } catch (e) { body.innerHTML = CTA.ui.errorBox('DATA_LOAD_FAILED'); }
  };
})();
