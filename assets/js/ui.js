/* 公共 UI：转义、占位、空状态、目的地卡片。所有用户/数据文本进 DOM 前必须过 esc。 */
(function () {
  window.CTA = window.CTA || {};
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  /* 图片焦点：画廊 object-fit: cover 居中裁切时，竖构图等主体偏上/偏下的图片会被切掉关键部位。
     focus 仅接受 top/center/bottom 三档（数据层可选字段，缺省 center）；映射为 object-position 的 Y 值：
     top=10% 时裁切带落在图片上部约 7–34%（桌面 2.08 框）/ 6–48%（手机 1.6 框），可容纳顶部主体；bottom=90% 对称取下部。 */
  function focusPos(focus) {
    if (focus === 'top') return 'center 10%';
    if (focus === 'bottom') return 'center 90%';
    return 'center 50%';
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
  function destCard(d, opts) {
    const fav = CTA.store.isFavorite(d.id);
    /* 首屏首张卡片可优先加载（fetchpriority=high 且不懒加载）；其余维持懒加载 */
    const prio = opts && opts.priority;
    const img = d.coverThumb
      ? '<img class="card-img" src="' + esc(d.coverThumb) + '" alt="' + esc(d.name) + '"' + (prio ? ' fetchpriority="high"' : ' loading="lazy"') + ' width="640" height="400" onerror="CTA.imgErr(this,\'card\')">'
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
  /* 画廊图片失败：占位块 + 重试按钮（不让详情页白屏，重试用原地址重新加载） */
  function galleryImgErr(img) {
    const ph = document.createElement('div');
    ph.className = 'slide-img slide-ph';
    const label = document.createElement('span');
    label.textContent = '图片加载失败';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'retry-btn';
    btn.textContent = '重试';
    btn.addEventListener('click', () => {
      const fresh = img.cloneNode();
      fresh.onerror = () => CTA.galleryImgErr(fresh);
      ph.replaceWith(fresh);
    });
    ph.appendChild(label);
    ph.appendChild(btn);
    img.replaceWith(ph);
  }
  CTA.ui = { esc, emptyState, errorBox, destCard, focusPos };
  CTA.imgErr = imgErr;
  CTA.galleryImgErr = galleryImgErr;
})();
