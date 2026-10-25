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
      ? '<div class="gallery" data-gallery><div class="gallery-track">' +
        imgs.map((im, i) =>
          '<figure class="slide"><img class="slide-img" src="' + esc(im.src) + '"' +
          (im.thumb ? ' srcset="' + esc(im.thumb) + ' 640w, ' + esc(im.src) + ' 1600w" sizes="(max-width: 720px) 100vw, 1080px"' : '') +
          ' alt="' + esc(im.alt || d.name) + '" width="1600" height="1000" ' +
          (i === 0 ? 'fetchpriority="high"' : 'loading="lazy"') +
          ' onerror="CTA.galleryImgErr(this)"></figure>').join('') +
        '</div><div class="gallery-bar"><span class="gallery-count" data-count>1 / ' + imgs.length + '</span>' +
        '<span class="img-credit" data-credit>图片：' + esc(imgs[0].credit || '') + '（' + esc(imgs[0].license || '') + '）</span>' +
        '<button type="button" class="gallery-zoom" data-zoom>⤢ 放大</button></div></div>'
      : '<div class="detail-hero hero-placeholder">图片待补充（须有明确授权后才上线）</div>';
    el.innerHTML =
      '<article class="detail">' + hero +
      '<h2>' + esc(d.name) + '</h2>' +
      '<p class="card-loc">' + esc(d.province) + ' · ' + esc(d.city) + (d.district ? ' · ' + esc(d.district) : '') + '</p>' +
      '<p>' + esc(d.summary) + '</p>' +
      '<div class="chip-row">' + (d.themes || []).map(t => '<span class="chip">' + esc((CTA.themeLabels || {})[t] || t) + '</span>').join('') + '</div>' +
      '<div class="detail-actions"><button class="fav-btn" data-fav="' + esc(d.id) + '" aria-pressed="' + fav + '">' + (fav ? '⭐ 已收藏' : '☆ 收藏') + '</button>' +
      '<a class="btn" href="#/planner?dest=' + encodeURIComponent(d.id) + '">加入规划</a></div>' +
      '<h3>主要特色</h3><ul>' + (d.highlights || []).map(h => '<li>' + esc(h) + '</li>').join('') + '</ul>' +
      '<h3>推荐活动</h3><ul>' + (d.activities || []).map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>' +
      '<h3>建议游玩</h3><p>' + esc(d.suggestedDays ? (d.suggestedDays.min + '–' + d.suggestedDays.max + ' 天') : '') +
      (d.seasonNotes ? '；' + esc(d.seasonNotes) : '') + '</p>' +
      '<h3>交通说明</h3><p>' + esc(d.transportNotes || '') + '</p>' +
      '<p class="muted">数据来源：' + esc(d.source && d.source.name ? d.source.name : '') + ' · 最近核验：' + esc(d.verifiedAt || '') + '</p>' +
      '<section id="weather-box"><h3>天气</h3><p class="muted">加载中…</p></section>' +
      '<section id="related-box" hidden><h3>相关目的地</h3><div class="card-grid" data-related></div></section>' +
      '</article>';

    /* 相关目的地：同省+3、每个共同主题+2、同类型+1；不足时按得分补齐，无结果则整段隐藏 */
    (async () => {
      try {
        const index = await CTA.dataService.loadIndex();
        const rel = CTA.pages._relatedFor(index, d.id, 4);
        if (!rel.length) return;
        const box2 = el.querySelector('#related-box');
        box2.querySelector('[data-related]').innerHTML = rel.map(e => CTA.ui.destCard(e)).join('');
        box2.hidden = false;
      } catch (e) { /* 索引不可用时静默降级，不影响详情主体 */ }
    })();

    /* 画廊行为：滚动计数、仅预加载下一张、放大查看 */
    const gallery = el.querySelector('[data-gallery]');
    if (gallery && imgs.length) {
      const track = gallery.querySelector('.gallery-track');
      const countEl = gallery.querySelector('[data-count]');
      const creditEl = gallery.querySelector('[data-credit]');
      let cur = 0;
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
        creditEl.textContent = '图片：' + (imgs[cur].credit || '') + '（' + (imgs[cur].license || '') + '）';
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
      promote(1);
      /* 大图查看层 */
      const lb = document.createElement('div');
      lb.className = 'lightbox'; lb.hidden = true;
      lb.innerHTML = '<button type="button" class="lb-close" aria-label="关闭">✕</button>' +
        '<button type="button" class="lb-prev" aria-label="上一张">‹</button>' +
        '<img class="lb-img" alt="">' +
        '<button type="button" class="lb-next" aria-label="下一张">›</button>' +
        '<p class="lb-caption"></p><p class="lb-count"></p>';
      document.body.appendChild(lb);
      const lbImg = lb.querySelector('.lb-img');
      function showLb(i) {
        cur = Math.max(0, Math.min(imgs.length - 1, i));
        lbImg.src = imgs[cur].src;
        lbImg.alt = imgs[cur].alt || d.name;
        lb.querySelector('.lb-caption').textContent = '图片：' + (imgs[cur].credit || '') + '（' + (imgs[cur].license || '') + '）';
        lb.querySelector('.lb-count').textContent = (cur + 1) + ' / ' + imgs.length;
        countEl.textContent = (cur + 1) + ' / ' + imgs.length;
        creditEl.textContent = lb.querySelector('.lb-caption').textContent;
        track.scrollTo({ left: cur * track.clientWidth, behavior: 'smooth' });
        promote(cur + 1);
      }
      function openLb() { lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus(); document.addEventListener('keydown', onKey); }
      function closeLb() { lb.hidden = true; document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); }
      function onKey(e) {
        if (e.key === 'Escape') closeLb();
        else if (e.key === 'ArrowRight') showLb(cur + 1);
        else if (e.key === 'ArrowLeft') showLb(cur - 1);
      }
      lb.querySelector('.lb-close').addEventListener('click', closeLb);
      lb.querySelector('.lb-prev').addEventListener('click', () => showLb(cur - 1));
      lb.querySelector('.lb-next').addEventListener('click', () => showLb(cur + 1));
      lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
      gallery.querySelector('[data-zoom]').addEventListener('click', () => { showLb(cur); openLb(); });
      track.addEventListener('click', e => { if (e.target.closest('img')) { showLb(cur); openLb(); } });
      /* 路由切换时清理大图层与键盘监听 */
      window.addEventListener('hashchange', function cleanup() {
        closeLb(); lb.remove(); window.removeEventListener('hashchange', cleanup);
      });
    }

    const box = el.querySelector('#weather-box');
    if (!CTA.config.features.weatherEnabled) { box.innerHTML = '<h3>天气</h3>' + CTA.ui.errorBox('WEATHER_UNAVAILABLE'); return; }
    try {
      const w = await CTA.weatherService.getWeather(d);
      const rows = (w.daily || []).map(day =>
        '<tr><td>' + esc(day.date) + '</td><td>' + esc(weatherText(day.weatherCode)) + '</td><td>' +
        esc(day.tempMin) + '° / ' + esc(day.tempMax) + '°</td><td>' + (day.precipProb == null ? '—' : esc(day.precipProb) + '%') + '</td></tr>').join('');
      box.innerHTML = '<h3>天气</h3>' +
        (w.stale ? '<p class="warn">' + esc(CTA.errorMessage('WEATHER_STALE')) + '</p>' : '') +
        '<p>现在：' + esc(weatherText(w.current.weatherCode)) + ' ' + esc(w.current.temp) + '°C（体感 ' + esc(w.current.feelsLike) + '°C），湿度 ' + esc(w.current.humidity) + '%</p>' +
        '<table class="weather-table"><thead><tr><th>日期</th><th>天气</th><th>低温/高温</th><th>降水概率</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p class="muted">更新于 ' + esc(w.updatedAt) + ' · 数据来源：' + (w.provider === 'open-meteo' ? 'Open-Meteo（CC BY 4.0）' : esc(w.provider)) + '</p>';
    } catch (e) {
      box.innerHTML = '<h3>天气</h3>' + CTA.ui.errorBox('WEATHER_UNAVAILABLE');
    }
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
