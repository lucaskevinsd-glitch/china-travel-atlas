(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  const WMO = { 0: '晴', 1: '晴间多云', 2: '多云', 3: '阴', 45: '雾', 48: '雾', 51: '小雨', 53: '小雨', 55: '中雨', 61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '冻雨', 71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒', 80: '阵雨', 81: '阵雨', 82: '暴雨', 85: '阵雪', 86: '阵雪', 95: '雷阵雨', 96: '雷阵雨伴冰雹', 99: '雷阵雨伴冰雹' };
  function weatherText(code) { return WMO[code] || '未知'; }

  CTA.pages.detail = async function (el, params) {
    const esc = CTA.ui.esc;
    el.innerHTML = '<p class="muted">加载中…</p>';
    let d;
    try { d = await CTA.dataService.getById(params.id); }
    catch (e) {
      el.innerHTML = '<h2>未找到</h2>' + CTA.ui.errorBox(e.code === 'DATA_NOT_FOUND' ? 'DATA_NOT_FOUND' : 'DATA_LOAD_FAILED') +
        '<p><a href="#/discover">返回发现页</a></p>';
      return;
    }
    const fav = CTA.store.isFavorite(d.id);
    const imgs = (d.images || []).filter(i => i && i.src);
    /* 横向画廊：第一张优先加载，其余懒加载；srcset 两档（缩略图 640w / 原图 1600w） */
    const hero = imgs.length
      ? '<div class="gallery" data-gallery><div class="gallery-stage"><div class="gallery-track">' +
        imgs.map((im, i) =>
          '<figure class="slide"><img class="slide-img" src="' + esc(im.src) + '"' +
          (im.thumb ? ' srcset="' + esc(im.thumb) + ' 640w, ' + esc(im.src) + ' 1600w" sizes="(max-width: 720px) 100vw, 1080px"' : '') +
          (im.focus ? ' style="object-position:' + esc(CTA.ui.focusPos(im.focus)) + '"' : '') +
          ' alt="' + esc(im.alt || d.name) + '" width="1600" height="1000" ' +
          (i === 0 ? 'fetchpriority="high"' : 'loading="lazy"') +
          ' onerror="CTA.galleryImgErr(this)"></figure>').join('') +
        '</div><button type="button" class="gallery-prev" data-prev aria-label="上一张">‹</button>' +
        '<button type="button" class="gallery-next" data-next aria-label="下一张">›</button></div>' +
        '<div class="gallery-thumbs" role="group" aria-label="图片缩略图">' +
        imgs.map((im, i) =>
          '<button type="button" data-thumb="' + i + '" class="' + (i === 0 ? 'active' : '') + '" aria-label="第' + (i + 1) + '张图片">' +
          '<img src="' + esc(im.thumb || im.src) + '" alt="" loading="lazy"></button>').join('') +
        '</div><div class="gallery-bar"><span class="gallery-count" data-count>1 / ' + imgs.length + '</span>' +
        '<a class="img-info" data-imginfo href="#/credits?dest=' + encodeURIComponent(d.id) + '&img=0">ⓘ 图片信息</a>' +
        '<button type="button" class="gallery-zoom" data-zoom>⤢ 放大</button></div></div>'
      : '<div class="detail-hero hero-placeholder">图片待补充（须有明确授权后才上线）</div>';
    /* 事实条与页内导航：全部取自已有数据字段（地区/类型/适游季节/建议天数），缺失项不渲染、不编造。 */
    const factItems = [];
    factItems.push('<div><dt>地区</dt><dd>' + esc(d.province) + ' · ' + esc(d.city) + (d.district ? ' · ' + esc(d.district) : '') + '</dd></div>');
    if (d.type) factItems.push('<div><dt>类型</dt><dd>' + esc((CTA.typeLabels || {})[d.type] || d.type) + '</dd></div>');
    if (d.bestSeasons && d.bestSeasons.length) factItems.push('<div><dt>适游季节</dt><dd>' + esc(d.bestSeasons.map(s => CTA.ui.seasonLabel(s)).join('、')) + '</dd></div>');
    if (d.suggestedDays) factItems.push('<div><dt>建议游玩</dt><dd>' + esc(d.suggestedDays.min + '–' + d.suggestedDays.max + ' 天') + '</dd></div>');
    /* 2.2：移除“数据来源/最近核验”展示行（访客无用；数据保留在 JSON 中，图片版权见 #/credits） */
    el.innerHTML =
      '<article class="detail">' + hero +
      '<p class="detail-eyebrow" data-detail-no></p>' +
      '<h2>' + esc(d.name) + '</h2>' +
      '<p>' + esc(d.summary) + '</p>' +
      '<dl class="fact-strip">' + factItems.join('') + '</dl>' +
      '<div class="chip-row">' + (d.themes || []).map(t => '<span class="chip">' + esc((CTA.themeLabels || {})[t] || t) + '</span>').join('') + '</div>' +
      '<div class="detail-actions"><button class="fav-btn" data-fav="' + esc(d.id) + '" aria-pressed="' + fav + '">' + (fav ? '⭐ 已收藏' : '☆ 收藏') + '</button>' +
      '<a class="btn" href="#/planner?dest=' + encodeURIComponent(d.id) + '">加入规划</a></div>' +
      '<nav class="detail-nav" aria-label="页面内导航"><button type="button" data-scroll-to="sec-highlights">主要特色</button><button type="button" data-scroll-to="sec-activities">推荐活动</button><button type="button" data-scroll-to="sec-plan">建议游玩</button><button type="button" data-scroll-to="sec-transport">交通说明</button><button type="button" data-scroll-to="rec-section" data-nav-related hidden>关联推荐</button></nav>' +
      '<h3 id="sec-highlights">主要特色</h3><ul>' + (d.highlights || []).map(h => '<li>' + esc(h) + '</li>').join('') + '</ul>' +
      '<h3 id="sec-activities">推荐活动</h3><ul>' + (d.activities || []).map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>' +
      '<h3 id="sec-plan">建议游玩</h3><p>' + esc(d.suggestedDays ? (d.suggestedDays.min + '–' + d.suggestedDays.max + ' 天') : '') +
      (d.seasonNotes ? '；' + esc(d.seasonNotes) : '') + '</p>' +
      '<h3 id="sec-transport">交通说明</h3><p>' + esc(d.transportNotes || '') + '</p>' +
      '<section id="rec-section" hidden><h3>关联推荐</h3>' +
      '<div class="rec-module" data-rec-nearby hidden><h4>附近值得一起游览</h4><p class="rec-intro">直线距离 300 公里以内，适合顺路一起游览</p><div class="card-grid"></div></div>' +
      '<div class="rec-module" data-rec-similar hidden><h4>相似旅行体验</h4><p class="rec-intro">与这里有相似的主题与旅行体验</p><div class="card-grid"></div></div>' +
      '<div class="rec-module" data-rec-extended hidden><h4>延伸探索</h4><p class="rec-intro">同一地区或同一主题的下一步探索</p><div class="card-grid"></div></div>' +
      '</section>' +
      '</article>';

    /* 页内导航：按钮 + scrollIntoView，不用 #sec-* 锚点（Hash 路由会把裸锚点当成未知路由）。
       相关目的地按钮仅在有相关结果时显示，避免无效控件。 */
    el.querySelector('.detail-nav').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-scroll-to]');
      if (!btn) return;
      const target = el.querySelector('#' + btn.getAttribute('data-scroll-to'));
      if (target) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
    /* B5 关联推荐：三层（附近 / 相似体验 / 延伸探索），由 recommendations.js 计算；模块为空时隐藏，不凑数。
       当前目的地不推荐自己，三层之间不重复（引擎内去重）。 */
    (async () => {
      try {
        const index = await CTA.dataService.loadIndex();
        /* 详情眉题编号：按完整索引位置计算（与卡片角标一致）；类型标签缺失时不写原始 id */
        const eyebrow = el.querySelector('[data-detail-no]');
        const pos = index.findIndex(e => e.id === d.id);
        if (eyebrow && pos >= 0) {
          const parts = ['No.' + String(pos + 1).padStart(2, '0')];
          const typeLabel = (CTA.typeLabels || {})[d.type];
          if (typeLabel) parts.push(typeLabel);
          parts.push(d.province, d.city);
          eyebrow.textContent = parts.join(' · ');
        }
        if (!CTA.recommendations || typeof CTA.recommendations.getRecommendations !== 'function') return;
        const rec = CTA.recommendations.getRecommendations(index, d.id, CTA.plannerGeo, { themes: CTA.themeLabels, types: CTA.typeLabels });
        const noOf = id => index.findIndex(x => x.id === id) + 1;
        const mods = [
          { key: 'nearby', sel: '[data-rec-nearby]' },
          { key: 'similar', sel: '[data-rec-similar]' },
          { key: 'extended', sel: '[data-rec-extended]' },
        ];
        let shown = 0;
        mods.forEach(m => {
          const items = rec[m.key] || [];
          if (!items.length) return;
          const box = el.querySelector(m.sel);
          box.querySelector('.card-grid').innerHTML = items.map(x =>
            CTA.ui.destCard(x.dest, { no: noOf(x.dest.id), note: x.reason })).join('');
          box.hidden = false;
          shown++;
        });
        if (!shown) return;
        el.querySelector('#rec-section').hidden = false;
        const navRel = el.querySelector('[data-nav-related]');
        if (navRel) navRel.hidden = false;
      } catch (e) { /* 索引不可用时静默降级，不影响详情主体 */ }
    })();

    /* 画廊行为：滚动计数、仅预加载下一张、放大查看 */
    const gallery = el.querySelector('[data-gallery]');
    if (gallery && imgs.length) {
      const track = gallery.querySelector('.gallery-track');
      const countEl = gallery.querySelector('[data-count]');
      const infoLink = gallery.querySelector('[data-imginfo]');
      const thumbBtns = gallery.querySelectorAll('[data-thumb]');
      let cur = 0;
      function goTo(i) {
        const t = Math.max(0, Math.min(imgs.length - 1, i));
        track.scrollTo({ left: t * track.clientWidth, behavior: 'smooth' });
      }
      const promoted = new Set([0]);
      function promote(i) {
        if (i < 0 || i >= imgs.length || promoted.has(i)) return;
        promoted.add(i);
        const img = track.children[i] && track.children[i].querySelector('img');
        if (img) img.loading = 'eager';
      }
      function setCur(i) {
        if (i === cur) { promote(cur + 1); return; }
        cur = i;
        countEl.textContent = (cur + 1) + ' / ' + imgs.length;
        if (infoLink) infoLink.href = '#/credits?dest=' + encodeURIComponent(d.id) + '&img=' + cur;
        thumbBtns.forEach((b, j) => b.classList.toggle('active', j === cur));
        promote(cur + 1);
      }
      let ticking = false;
      track.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
          if (i !== cur && i >= 0 && i < imgs.length) setCur(i);
        });
      }, { passive: true });
      /* 画廊箭头与缩略图：滚动事件会经 setCur 同步计数、署名与激活态 */
      const prevBtn = gallery.querySelector('[data-prev]');
      const nextBtn = gallery.querySelector('[data-next]');
      if (prevBtn) prevBtn.addEventListener('click', () => goTo(cur - 1));
      if (nextBtn) nextBtn.addEventListener('click', () => goTo(cur + 1));
      thumbBtns.forEach(b => b.addEventListener('click', () => goTo(parseInt(b.getAttribute('data-thumb'), 10))));
      promote(1);
      /* 大图查看层 */
      const lb = document.createElement('div');
      lb.className = 'lightbox'; lb.hidden = true;
      lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', '图片查看器');
      lb.innerHTML = '<button type="button" class="lb-close" aria-label="关闭">✕</button>' +
        '<button type="button" class="lb-prev" aria-label="上一张">‹</button>' +
        '<img class="lb-img" alt="">' +
        '<button type="button" class="lb-next" aria-label="下一张">›</button>' +
        '<p class="lb-caption"><a class="lb-info" data-lbinfo href="#">ⓘ 图片信息</a></p><p class="lb-count"></p>';
      document.body.appendChild(lb);
      const lbImg = lb.querySelector('.lb-img');
      function showLb(i) {
        cur = Math.max(0, Math.min(imgs.length - 1, i));
        lbImg.src = imgs[cur].src;
        lbImg.alt = imgs[cur].alt || d.name;
        const lbInfo = lb.querySelector('[data-lbinfo]');
        if (lbInfo) lbInfo.href = '#/credits?dest=' + encodeURIComponent(d.id) + '&img=' + cur;
        lb.querySelector('.lb-count').textContent = (cur + 1) + ' / ' + imgs.length;
        countEl.textContent = (cur + 1) + ' / ' + imgs.length;
        if (infoLink) infoLink.href = '#/credits?dest=' + encodeURIComponent(d.id) + '&img=' + cur;
        thumbBtns.forEach((b, j) => b.classList.toggle('active', j === cur));
        track.scrollTo({ left: cur * track.clientWidth, behavior: 'smooth' });
        promote(cur + 1);
      }
      /* 灯箱焦点管理：打开时保存触发控件并移入焦点；Tab/Shift+Tab 陷阱在灯箱内；
         Escape/遮罩点击关闭；关闭后焦点返回触发控件（不存在则回退到放大按钮）。 */
      let lbOpen = false, lbTrigger = null;
      const lbFocusables = () => [lb.querySelector('.lb-close'), lb.querySelector('.lb-prev'), lb.querySelector('.lb-next')].filter(Boolean);
      function openLb(trigger) {
        if (lbOpen) return;
        lbOpen = true;
        lbTrigger = (trigger && document.contains(trigger)) ? trigger : gallery.querySelector('[data-zoom]');
        lb.hidden = false; document.body.style.overflow = 'hidden';
        lb.querySelector('.lb-close').focus();
        document.addEventListener('keydown', onKey);
      }
      function closeLb() {
        if (!lbOpen) return;
        lbOpen = false;
        lb.hidden = true; document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        const back = (lbTrigger && document.contains(lbTrigger)) ? lbTrigger : gallery.querySelector('[data-zoom]');
        lbTrigger = null;
        if (back && back.focus) back.focus();
      }
      function onKey(e) {
        if (!lbOpen) return;
        if (e.key === 'Escape') { closeLb(); return; }
        if (e.key === 'ArrowRight') { showLb(cur + 1); return; }
        if (e.key === 'ArrowLeft') { showLb(cur - 1); return; }
        if (e.key === 'Tab') {
          const f = lbFocusables();
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      lb.querySelector('.lb-close').addEventListener('click', closeLb);
      lb.querySelector('.lb-prev').addEventListener('click', () => showLb(cur - 1));
      lb.querySelector('.lb-next').addEventListener('click', () => showLb(cur + 1));
      lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
      const zoomBtn = gallery.querySelector('[data-zoom]');
      zoomBtn.addEventListener('click', e => { showLb(cur); openLb(e.currentTarget); });
      track.addEventListener('click', e => { if (e.target.closest('img')) { showLb(cur); openLb(zoomBtn); } });
      /* 路由切换时清理大图层与键盘监听 */
      window.addEventListener('hashchange', function cleanup() {
        closeLb(); lb.remove(); window.removeEventListener('hashchange', cleanup);
      });
    }

    /* 2.2：天气区块已整体移除（功能关闭，对访客无用；天气服务模块保留，待正式接入时再恢复） */
  };
  CTA.pages._weatherText = weatherText;
  /* 纯函数：相关目的地排序（可单测）。entries 为索引条目（含 province/themes/type）。
     计分：同省 +3、每个共同主题 +2、同类型 +1。仅保留 score >= 3 者（第三轮审查结论：
     2 分档多为仅共享 family 的泛匹配，如亚龙湾→漓江/青海湖，相关性不足时宁缺毋滥，
     宁可少于 4 张也不强行填满；30 条实测：仅亚龙湾由 4 张降为 1 张，无零结果目的地）。 */
  CTA.pages._relatedFor = function (entries, currentId, limit) {
    const cur = (entries || []).find(e => e.id === currentId);
    if (!cur) return [];
    const curThemes = new Set(cur.themes || []);
    return (entries || [])
      .filter(e => e.id !== currentId)
      .map((e, i) => {
        const shared = (e.themes || []).filter(t => curThemes.has(t)).length;
        const score = (e.province === cur.province ? 3 : 0) + shared * 2 + (e.type === cur.type ? 1 : 0);
        return { e, i, score };
      })
      .filter(x => x.score >= 3)
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, limit || 4)
      .map(x => x.e);
  };
})();
