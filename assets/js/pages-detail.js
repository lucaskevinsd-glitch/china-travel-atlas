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
    const hero = imgs.length
      ? '<img class="detail-hero" src="' + esc(imgs[0].src) + '" alt="' + esc(imgs[0].alt || d.name) + '" width="1200" height="675" onerror="CTA.imgErr(this,\'hero\')">' +
        '<p class="img-credit">图片：' + esc(imgs[0].credit || '') + '（' + esc(imgs[0].license || '') + '）</p>'
      : '<div class="detail-hero hero-placeholder">图片待补充（须有明确授权后才上线）</div>';
    el.innerHTML =
      '<article class="detail">' + hero +
      '<h2>' + esc(d.name) + '</h2>' +
      '<p class="card-loc">' + esc(d.province) + ' · ' + esc(d.city) + (d.district ? ' · ' + esc(d.district) : '') + '</p>' +
      '<p>' + esc(d.summary) + '</p>' +
      '<div class="chip-row">' + (d.themes || []).map(t => '<span class="chip">' + esc((CTA.themeLabels || {})[t] || t) + '</span>').join('') + '</div>' +
      '<h3>主要特色</h3><ul>' + (d.highlights || []).map(h => '<li>' + esc(h) + '</li>').join('') + '</ul>' +
      '<h3>推荐活动</h3><ul>' + (d.activities || []).map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>' +
      '<h3>建议游玩</h3><p>' + esc(d.suggestedDays ? (d.suggestedDays.min + '–' + d.suggestedDays.max + ' 天') : '') +
      (d.seasonNotes ? '；' + esc(d.seasonNotes) : '') + '</p>' +
      '<h3>交通说明</h3><p>' + esc(d.transportNotes || '') + '</p>' +
      '<p class="muted">数据来源：' + esc(d.source && d.source.name ? d.source.name : '') + ' · 最近核验：' + esc(d.verifiedAt || '') + '</p>' +
      '<div class="detail-actions"><button class="fav-btn" data-fav="' + esc(d.id) + '" aria-pressed="' + fav + '">' + (fav ? '⭐ 已收藏' : '☆ 收藏') + '</button>' +
      '<a class="btn" href="#/planner?dest=' + encodeURIComponent(d.id) + '">加入规划</a></div>' +
      '<section id="weather-box"><h3>天气</h3><p class="muted">加载中…</p></section>' +
      '</article>';

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
})();
