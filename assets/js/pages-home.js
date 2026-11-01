/* 首页 2.2（方案 A 沉浸风景 + B 的眉题/省份索引列表）：
   第一屏纯风景轮播（零可见文字）→ 粘性页内导航 → 旅行主题（不对称摄影网格）
   → 精选目的地（1 大 + 2 卡）→ 按省份探索（索引列表，真实数量）→ 页脚。
   搜索功能保留在发现页（关键词框），首页不再重复。 */
(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  /* 首屏轮播：5 张真实高清大图（正式集 1600w 原图）；按 id 从索引取名称与封面，缺失则跳过 */
  const CAROUSEL_IDS = ['huangshan', 'zhangye-danxia', 'hongya-cave', 'gulangyu', 'mogao-caves'];
  /* 主题展示：显示名 + 对应的真实数据主题 id（城市漫游取古镇古城，副文案写明对应关系） */
  const THEME_SHOW = [
    { theme: 'nature', title: '自然山水', sub: '山岳云海，走向旷野' },
    { theme: 'historic', title: '历史人文', sub: '宫殿石窟，读懂时间' },
    { theme: 'ancient-town', title: '城市漫游', sub: '古城街巷，漫步时光' },
    { theme: 'coastal', title: '休闲度假', sub: '海岛海岸，放空度假' },
  ];

  CTA.pages.home = async function (el) {
    document.body.classList.add('home-hero');
    el.innerHTML = '<div id="home-body"><p class="muted">加载中…</p></div>';
    const body = el.querySelector('#home-body');
    try {
      const index = await CTA.dataService.loadIndex();
      const esc = CTA.ui.esc;
      const byId = {};
      index.forEach(d => { byId[d.id] = d; });

      /* —— 第一屏：纯风景轮播 —— */
      const slides = CAROUSEL_IDS.map(id => byId[id]).filter(Boolean).slice(0, 5);
      const carSlides = slides.map((d, i) =>
        '<a class="car-slide' + (i === 0 ? ' on' : '') + '" href="#/dest/' + encodeURIComponent(d.id) + '"' +
        ' aria-roledescription="slide" aria-label="' + esc(d.name) + '（第' + (i + 1) + '张，共' + slides.length + '张，点击进入详情）"' +
        (i === 0 ? '' : ' aria-hidden="true"') + ' tabindex="' + (i === 0 ? '0' : '-1') + '">' +
        '<img class="car-img" src="' + esc(d.coverFull || d.coverThumb) + '"' +
        ' srcset="' + esc(d.coverThumb || '') + ' 640w, ' + esc(d.coverFull || d.coverThumb || '') + ' 1600w" sizes="100vw"' +
        ' alt=""' + (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') +
        ' onerror="CTA.imgErr(this,\'hero\')"></a>').join('');
      const carDots = slides.map((d, i) =>
        '<button type="button" class="car-dot' + (i === 0 ? ' on' : '') + '" data-dot="' + i + '" aria-label="第' + (i + 1) + '张：' + esc(d.name) + '"></button>').join('');
      let html = '<section class="car" data-carousel aria-roledescription="carousel" aria-label="中国风景轮播">' +
        (slides.length ? '<link rel="preload" as="image" href="' + esc(slides[0].coverFull || '') + '">' : '') +
        '<div class="car-track">' + carSlides + '</div>' +
        '<div class="car-ctl"><button type="button" data-car-pause aria-label="暂停或播放轮播">❚❚</button>' +
        '<button type="button" data-car-prev aria-label="上一张">‹</button>' +
        '<button type="button" data-car-next aria-label="下一张">›</button></div>' +
        '<div class="car-dots" role="group" aria-label="轮播指示">' + carDots + '</div></section>';

      /* —— 粘性页内导航（首屏之后出现） —— */
      html += '<header class="home-nav"><a class="brand" href="#/">中国旅行图鉴</a>' +
        '<nav aria-label="主导航"><a href="#/">首页</a><a href="#/discover">发现</a><a href="#/planner">规划</a><a href="#/favorites">收藏</a></nav></header>';

      /* —— 第二屏：旅行主题（主题卡取该主题首条结果封面，图文严格对应） —— */
      const themeCards = THEME_SHOW.map((t, k) => {
        const rep = index.find(d => (d.themes || []).indexOf(t.theme) !== -1);
        if (!rep) return '';
        return '<a class="theme-card tc' + (k + 1) + '" href="#/discover?theme=' + encodeURIComponent(t.theme) + '">' +
          '<img src="' + esc(rep.coverThumb || rep.coverFull) + '" alt="" loading="lazy" onerror="CTA.imgErr(this,\'card\')">' +
          '<span class="theme-t"><b>' + esc(t.title) + '</b><span>' + esc(t.sub) + '</span></span></a>';
      }).join('');
      html += '<main><div class="wrap"><p class="kicker">Themes · 旅行主题</p><h2 class="sec-title">先选一种心情，再选目的地</h2>' +
        '<div class="theme-grid">' + themeCards + '</div></div>';

      /* —— 第三屏：精选目的地（索引前 3 条，1 大 + 2 卡；No. 眉题保留编辑式层级） —— */
      const feat = index.slice(0, 3);
      if (feat.length) {
        const f0 = feat[0];
        const side = feat.slice(1).map((d, k) =>
          '<a class="feat-card" href="#/dest/' + encodeURIComponent(d.id) + '">' +
          '<img src="' + esc(d.coverThumb || d.coverFull) + '" alt="" loading="lazy" onerror="CTA.imgErr(this,\'card\')">' +
          '<span class="feat-card-t"><span class="kicker">No.' + String(k + 2).padStart(2, '0') + '</span><b>' + esc(d.name) + '</b>' +
          '<span>' + esc(d.province) + ' · ' + esc((d.summary || '').slice(0, 28)) + '</span></span></a>').join('');
        html += '<div class="wrap"><p class="kicker">Featured · 本期精选</p><h2 class="sec-title">值得专程前往</h2>' +
          '<div class="feat"><a class="feat-main" href="#/dest/' + encodeURIComponent(f0.id) + '">' +
          '<img src="' + esc(f0.coverFull || f0.coverThumb) + '" alt="" loading="lazy" onerror="CTA.imgErr(this,\'card\')">' +
          '<span class="feat-main-t"><span class="kicker">No.01</span><b>' + esc(f0.name) + '</b>' +
          '<span>' + esc(f0.province) + ' · ' + esc(f0.city) + ' · ' + esc((f0.summary || '').slice(0, 40)) + '</span></span></a>' +
          '<div class="feat-side">' + side + '</div></div></div>';
      }

      /* —— 第四屏：按省份探索（B 的索引列表；数量来自真实索引实时计算） —— */
      const counts = {};
      index.forEach(d => { counts[d.province] = (counts[d.province] || 0) + 1; });
      const provRows = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b, 'zh'))
        .map(p => '<a href="#/discover?province=' + encodeURIComponent(p) + '"><b>' + esc(p) + '</b><span>' + counts[p] + ' 个目的地</span></a>').join('');
      html += '<div class="wrap"><p class="kicker">Provinces · 省份索引</p><h2 class="sec-title">按省份探索</h2>' +
        '<p class="sec-sub">' + Object.keys(counts).length + ' 个省级地区已有收录，数量来自真实数据</p>' +
        '<div class="index-list">' + provRows + '</div></div></main>';

      body.innerHTML = html;
      initCarousel(body.querySelector('[data-carousel]'));
    } catch (e) {
      body.innerHTML = CTA.ui.errorBox('DATA_LOAD_FAILED');
    }
  };

  /* 轮播行为：切换/圆点/暂停/触摸滑动/键盘（按钮原生可达）/减动效 */
  function initCarousel(root) {
    if (!root) return;
    const slides = Array.from(root.querySelectorAll('.car-slide'));
    const dots = Array.from(root.querySelectorAll('.car-dot'));
    const prev = root.querySelector('[data-car-prev]');
    const next = root.querySelector('[data-car-next]');
    const pause = root.querySelector('[data-car-pause]');
    if (!slides.length) return;
    let i = 0, timer = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        s.classList.toggle('on', k === i);
        s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
        s.tabIndex = k === i ? 0 : -1;
      });
      dots.forEach((d2, k) => d2.classList.toggle('on', k === i));
    }
    function play() {
      if (reduce || timer) return;
      timer = setInterval(() => go(i + 1), 6000);
      if (pause) { pause.textContent = '❚❚'; pause.setAttribute('aria-label', '暂停轮播'); }
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      if (pause) { pause.textContent = '▶'; pause.setAttribute('aria-label', '播放轮播'); }
    }
    if (prev) prev.addEventListener('click', () => { go(i - 1); stop(); });
    if (next) next.addEventListener('click', () => { go(i + 1); stop(); });
    dots.forEach((d2, k) => d2.addEventListener('click', () => { go(k); stop(); }));
    if (pause) pause.addEventListener('click', () => { timer ? stop() : play(); });
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', play);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', play);
    let x0 = null;
    root.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    root.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
    go(0); play();
    /* 页面卸载时清理定时器（路由切换为整页重渲染，hashchange 时停） */
    window.addEventListener('hashchange', function cleanup() {
      stop(); window.removeEventListener('hashchange', cleanup);
    });
  }
})();
