/* 摄影版权页：统一展示全部 published 目的地图片的作者、来源链接、许可证与许可链接。
   数据来自真实数据字段（credit/license/sourceUrl），不编造。深链：#/credits?dest=<id>&img=<idx>
   进入后滚动到对应目的地分区并高亮；img 参数进一步高亮对应图片行。 */
(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  CTA.pages.credits = async function (el, params) {
    const esc = CTA.ui.esc;
    el.innerHTML = '<p class="muted">加载中…</p>';
    let index;
    try { index = await CTA.dataService.loadIndex(); }
    catch (e) { el.innerHTML = CTA.ui.errorBox('DATA_LOAD_FAILED'); return; }
    /* 逐条取完整记录（含 images 数组）；shard 缓存使 30 次调用只产生一次分片请求 */
    const dests = [];
    for (const entry of index) {
      try { dests.push(await CTA.dataService.getById(entry.id)); }
      catch (e) { /* 单条失败不阻塞整页 */ }
    }
    let html = '<div class="credits-page"><p class="kicker">Credits · 摄影版权</p><h1>摄影版权</h1>' +
      '<p class="credits-intro">本站图片为真实摄影作品，版权归原作者所有。每张图片的作者、来源链接、许可证及许可链接列出如下；' +
      'CC 系列许可证要求署名作者、声明许可、给出处链接并标记改编（本站图片均经缩放并转为 WebP）。点击来源链接可查看原作品页面。</p>';
    /* B1：首页轮播图（data/heroes.json，独立于目的地相册） */
    try {
      const heroes = await CTA.dataService.loadHeroes();
      const hh = (heroes || []).filter(h => h && h.src);
      if (hh.length) {
        html += '<section class="credit-dest" id="cd-heroes" aria-label="首页轮播图片版权">' +
          '<h2>首页轮播 <span class="credit-dest-prov">Hero Carousel · ' + hh.length + ' 张</span></h2><ul class="credit-list">';
        hh.forEach((h, i) => {
          const deed = CTA.ui.licenseUrl(h.license);
          html += '<li class="credit-img" id="ci-heroes-' + i + '">' +
            '<img src="' + esc(h.src) + '" alt="' + esc(h.alt || '') + '" loading="lazy" onerror="CTA.imgErr(this,\'thumb\')">' +
            '<div class="credit-meta"><p class="credit-file">' + esc((h.src || '').split('/').pop()) + '（→ ' + esc(h.destId || '') + '）</p>' +
            '<p>作者：' + esc(h.credit || '未标注') + '</p>' +
            '<p>来源：<a href="' + esc(h.sourceUrl || '') + '" target="_blank" rel="noopener noreferrer">查看原作品页面</a></p>' +
            '<p>许可：' + (deed
              ? '<a href="' + esc(deed) + '" target="_blank" rel="noopener noreferrer">' + esc(h.license) + '</a>'
              : esc(h.license || '未标注')) + '</p></div></li>';
        });
        html += '</ul></section>';
      }
    } catch (e) { /* heroes 加载失败不阻塞版权页 */ }
    for (const d of dests) {
      const imgs = (d.images || []).filter(i => i && i.src);
      if (!imgs.length) continue;
      html += '<section class="credit-dest" id="cd-' + esc(d.id) + '" aria-label="' + esc(d.name) + ' 图片版权">' +
        '<h2><a href="#/dest/' + encodeURIComponent(d.id) + '">' + esc(d.name) + '</a>' +
        '<span class="credit-dest-prov">' + esc(d.province) + (d.city ? ' · ' + esc(d.city) : '') + '</span></h2><ul class="credit-list">';
      imgs.forEach((im, i) => {
        const deed = CTA.ui.licenseUrl(im.license);
        html += '<li class="credit-img" id="ci-' + esc(d.id) + '-' + i + '">' +
          '<img src="' + esc(im.thumb || im.src) + '" alt="" loading="lazy" width="160" height="100">' +
          '<div class="credit-meta"><p class="credit-file">' + esc((im.src || '').split('/').pop()) + '</p>' +
          '<p>作者：' + esc(im.credit || '未标注') + '</p>' +
          (im.sourceUrl
            ? '<p>来源：<a href="' + esc(im.sourceUrl) + '" target="_blank" rel="noopener noreferrer">查看原作品页面</a></p>'
            : '<p>来源：暂缺（待补证）</p>') +
          '<p>许可：' + (deed
            ? '<a href="' + esc(deed) + '" target="_blank" rel="noopener noreferrer">' + esc(im.license) + '</a>'
            : esc(im.license || '未标注')) + '</p></div></li>';
      });
      html += '</ul></section>';
    }
    html += '</div>';
    el.innerHTML = html;
    /* 深链定位：dest 分区滚动 + 高亮；img 行进一步高亮 */
    try {
      const destId = params && params.dest;
      if (destId) {
        const sec = el.querySelector('#cd-' + CSS.escape(destId));
        if (sec) {
          sec.scrollIntoView({ block: 'start' });
          sec.classList.add('flash');
          const idx = params.img != null ? parseInt(params.img, 10) : NaN;
          if (!isNaN(idx)) {
            const row = el.querySelector('#ci-' + CSS.escape(destId) + '-' + idx);
            if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('flash'); }
          }
        }
      }
    } catch (e) { /* 定位失败不阻塞页面 */ }
  };
})();
