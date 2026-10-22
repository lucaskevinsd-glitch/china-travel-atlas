/* 公共 UI：转义、占位、空状态、目的地卡片。所有用户/数据文本进 DOM 前必须过 esc。 */
(function () {
  window.CTA = window.CTA || {};
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function emptyState(title, hint) {
    return '<div class="empty-state"><p class="empty-title">' + esc(title) + '</p>' +
      (hint ? '<p class="empty-hint">' + esc(hint) + '</p>' : '') + '</div>';
  }
  function errorBox(code) {
    return '<div class="error-box" role="alert">' + esc(CTA.errorMessage(code)) + '</div>';
  }
  /* 图片加载失败降级：以占位块替换破图（真实浏览器冒烟发现，2026-10-22）。 */
  function imgErr(img, kind) {
    const div = document.createElement('div');
    div.className = img.className + (kind === 'hero' ? ' hero-placeholder' : ' card-img-placeholder');
    div.textContent = kind === 'hero' ? '图片加载失败' : '🏞️';
    img.replaceWith(div);
  }
  function destCard(d) {
    const fav = CTA.store.isFavorite(d.id);
    const img = d.coverThumb
      ? '<img class="card-img" src="' + esc(d.coverThumb) + '" alt="' + esc(d.name) + '" loading="lazy" width="640" height="400" onerror="CTA.imgErr(this,\'card\')">'
      : '<div class="card-img card-img-placeholder" aria-hidden="true">🏞️</div>';
    const themes = (d.themes || []).map(t => '<span class="chip">' + esc((CTA.themeLabels || {})[t] || t) + '</span>').join('');
    return '<article class="dest-card">' +
      '<a class="card-link" href="#/dest/' + encodeURIComponent(d.id) + '">' + img +
      '<div class="card-body"><h3>' + esc(d.name) + '</h3>' +
      '<p class="card-loc">' + esc(d.province) + ' · ' + esc(d.city) + '</p>' +
      '<p class="card-summary">' + esc(d.summary || '') + '</p>' +
      '<div class="chip-row">' + themes + '</div></div></a>' +
      '<button class="fav-btn" data-fav="' + esc(d.id) + '" aria-pressed="' + fav + '">' + (fav ? '⭐ 已收藏' : '☆ 收藏') + '</button>' +
      '</article>';
  }
  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('[data-fav]');
    if (!btn) return;
    const now = CTA.store.toggleFavorite(btn.getAttribute('data-fav'));
    btn.setAttribute('aria-pressed', now);
    btn.textContent = now ? '⭐ 已收藏' : '☆ 收藏';
  });
  CTA.ui = { esc, emptyState, errorBox, destCard };
  CTA.imgErr = imgErr;
})();
