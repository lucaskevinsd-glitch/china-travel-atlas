(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  CTA.pages.home = async function (el) {
    el.innerHTML = '<div id="home-body"><p class="muted">加载中…</p></div>';
    const body = el.querySelector('#home-body');
    try {
      const [index, themesDoc, provincesDoc, meta] = await Promise.all([
        CTA.dataService.loadIndex(), CTA.dataService.loadThemes(), CTA.dataService.loadProvinces(), CTA.dataService.loadMeta(),
      ]);
      const esc = CTA.ui.esc;
      const seasons = (themesDoc.seasons || []);
      const featured = index[0];
      let html = '';
      /* 主视觉：第一条精选目的地的实景图（原图 1600w/缩略图 640w 两档）+ 搜索入口 */
      html += '<section class="hero">' +
        (featured && featured.coverFull
          ? '<img class="hero-img" src="' + esc(featured.coverFull) + '" srcset="' + esc(featured.coverThumb) + ' 640w, ' + esc(featured.coverFull) + ' 1600w" sizes="100vw" alt="' + esc(featured.name) + '" fetchpriority="high" width="1600" height="900" onerror="CTA.imgErr(this,\'hero\')">'
          : '') +
        '<div class="hero-overlay"><p class="hero-eyebrow">China Travel Atlas · ' + index.length + ' 个目的地 · 覆盖 ' + new Set(index.map(d => d.province)).size + ' 省</p><h2>发现中国值得去的地方</h2>' +
        '<p>按自然风景、季节与主题找目的地，再生成你的行程草案。</p>' +
        '<form class="hero-search" id="home-search"><input type="search" id="home-q" placeholder="搜索目的地，如古城、海岛" aria-label="搜索目的地">' +
        '<button type="submit">搜索</button></form>' +
        (featured ? '<p class="hero-caption">图：' + esc(featured.name) + ' · ' + esc(featured.province) + '</p>' : '') +
        '</div></section>';
      /* 主题横滑模块 */
      html += '<section><div class="section-head"><h3>旅行主题</h3></div><div class="theme-scroll">' +
        themesDoc.themes.map(t => '<a class="theme-card" href="#/discover?theme=' + encodeURIComponent(t.id) + '">' + esc(t.label) + '</a>').join('') + '</div></section>';
      /* 目的地先行：首屏后尽快看到内容；季节与省份入口后置，避免 31 个省份 chip 把卡片顶出首屏 */
      html += '<section><div class="section-head"><h3>已发布目的地（' + index.length + '）</h3><a class="section-more" href="#/discover">查看全部 →</a></div>';
      html += index.length
        ? '<div class="card-grid">' + index.slice(0, 6).map((d, i) => CTA.ui.destCard(d, i === 0 ? { priority: true } : undefined)).join('') + '</div>'
        : CTA.ui.emptyState('目的地数据正在核验录入中', '首批目的地经来源与坐标核验后才会发布，当前没有已发布条目。数据更新：' + esc(meta.updated || ''));
      html += '</section>';
      /* 季节推荐 */
      if (seasons.length) {
        html += '<section><div class="section-head"><h3>季节推荐</h3></div><div class="chip-row big">' +
          seasons.map(s => '<a class="chip link-chip" href="#/discover?season=' + encodeURIComponent(s.id) + '">' + esc(s.label) + '</a>').join('') + '</div></section>';
      }
      html += '<section><div class="section-head"><h3>按省份浏览</h3></div><div class="province-wrap" id="province-wrap">' +
        provincesDoc.provinces.map(p => '<a class="chip link-chip" href="#/discover?province=' + encodeURIComponent(p.name) + '">' + esc(p.name) + '</a>').join('') + '</div>' +
        '<button type="button" class="province-toggle" id="province-toggle" aria-expanded="false">＋ 展开全部 ' + provincesDoc.provinces.length + ' 省</button></section>';
      body.innerHTML = html;
      const provToggle = body.querySelector('#province-toggle');
      const provWrap = body.querySelector('#province-wrap');
      if (provToggle && provWrap) provToggle.addEventListener('click', function () {
        const open = provWrap.classList.toggle('open');
        provToggle.setAttribute('aria-expanded', open);
        provToggle.textContent = open ? '收起' : '＋ 展开全部 ' + provincesDoc.provinces.length + ' 省';
      });
      const form = body.querySelector('#home-search');
      if (form) form.addEventListener('submit', e => {
        e.preventDefault();
        const q = body.querySelector('#home-q').value.trim();
        location.hash = '#/discover' + (q ? '?keyword=' + encodeURIComponent(q) : '');
      });
    } catch (e) {
      body.innerHTML = CTA.ui.errorBox('DATA_LOAD_FAILED');
    }
  };
})();
