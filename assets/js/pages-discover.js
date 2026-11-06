(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  CTA.pages.discover = async function (el, params) {
    const esc = CTA.ui.esc;
    /* 离开发现页时移除上一轮的滚动监听，避免重复绑定。 */
    if (CTA._discScrollCleanup) { CTA._discScrollCleanup(); CTA._discScrollCleanup = null; }
    /* 筛选 URL 同步：可分享状态的唯一来源是 URL，优先级为——
       ①前进/后退恢复的历史状态（history.state，本页 pushState/replaceState 写入）；
       ②URL 参数（分享链接、首页 chip、首页搜索等显式入口）；
       ③localStorage 保存的上次状态（无参数、无历史状态时）。
       这样 URL 与页面状态一致，且后退不会被后来 persist 的 localStorage 静默覆盖。
       注意：发现页实际筛选项只有 keyword/province/theme/season 四项（数据模型里的 type
       没有对应的筛选控件，不编造 type 参数）。 */
    const FILTER_KEYS = ['keyword', 'province', 'theme', 'season'];
    function pickFilters(obj) {
      const out = {};
      FILTER_KEYS.forEach(k => { out[k] = (obj && typeof obj[k] === 'string') ? obj[k] : ''; });
      return out;
    }
    const navState = (history.state && typeof history.state === 'object' &&
      FILTER_KEYS.some(k => typeof history.state[k] === 'string')) ? pickFilters(history.state) : null;
    const hasParams = FILTER_KEYS.some(k => params && params[k]);
    const saved = CTA.store.getDiscoverState();
    const init = navState || (hasParams ? pickFilters(params) : pickFilters(saved));
    const scrollSource = navState ? 'history' : (hasParams ? 'params' : 'saved');
    function buildQuery(f) {
      const q = new URLSearchParams();
      FILTER_KEYS.forEach(k => { if (f[k]) q.set(k, f[k]); });
      const s = q.toString();
      return s ? '?' + s : '';
    }
    /* 同步 URL 与历史状态：离散改动（下拉、提交、清除）用 pushState，产生可后退的历史条目；
       连续输入（关键词去抖）用 replaceState，只更新当前条目，不刷屏历史记录。
       pushState/replaceState 均不触发 hashchange，不会引起路由重渲染循环。
       hash 已等于目标时仍 replaceState，确保 history.state 与筛选值一致。 */
    function syncUrl(f, mode) {
      const target = '#/discover' + buildQuery(f);
      if (location.hash === target) { history.replaceState(f, '', target); return; }
      if (mode === 'push') history.pushState(f, '', target);
      else history.replaceState(f, '', target);
    }
    el.innerHTML =
      '<h2><span class="sec-no">01</span>发现目的地</h2>' +
      '<form id="discover-form" class="filter-form">' +
      '<label>关键词<input type="search" id="f-keyword" placeholder="目的地 / 省 / 市" value="' + esc(init.keyword) + '"></label>' +
      '<label>省份<select id="f-province"><option value="">全部</option></select></label>' +
      '<label>主题<select id="f-theme"><option value="">全部</option></select></label>' +
      '<label>适宜季节<select id="f-season"><option value="">全部</option><option value="spring">春季</option><option value="summer">夏季</option><option value="autumn">秋季</option><option value="winter">冬季</option></select></label>' +
      '<button type="submit">筛选</button></form>' +
      '<div id="discover-results"><p class="muted">加载中…</p></div>';
    const results = el.querySelector('#discover-results');
    let index = [];
    let newsItems = [];
    let themesDoc = null;
    try {
      const [idx, themes, provincesDoc, news] = await Promise.all([
        CTA.dataService.loadIndex(), CTA.dataService.loadThemes(), CTA.dataService.loadProvinces(),
        CTA.dataService.loadNews(),
      ]);
      index = idx;
      themesDoc = themes;
      newsItems = news || [];
      const provSel = el.querySelector('#f-province');
      provincesDoc.provinces.forEach(p => {
        const o = document.createElement('option'); o.value = p.name; o.textContent = p.name;
        if (init.province === p.name) o.selected = true; provSel.appendChild(o);
      });
      const themeSel = el.querySelector('#f-theme');
      themesDoc.themes.forEach(t => {
        const o = document.createElement('option'); o.value = t.id; o.textContent = t.label;
        if (init.theme === t.id) o.selected = true; themeSel.appendChild(o);
      });
      const seasonSel = el.querySelector('#f-season');
      if (init.season) seasonSel.value = init.season;
      /* 非法参数清洗：省份、主题须在已知列表内，季节须为四季之一；非法值按空处理，
         并用 replaceState 把清洗后的状态写回 URL（不产生新历史条目，不重渲染）。 */
      const clean = {
        keyword: init.keyword,
        province: provincesDoc.provinces.some(p => p.name === init.province) ? init.province : '',
        theme: themesDoc.themes.some(t => t.id === init.theme) ? init.theme : '',
        season: ['spring', 'summer', 'autumn', 'winter'].indexOf(init.season) !== -1 ? init.season : '',
      };
      if (JSON.stringify(clean) !== JSON.stringify(init)) {
        Object.assign(init, clean);
        el.querySelector('#f-keyword').value = clean.keyword;
        provSel.value = clean.province;
        themeSel.value = clean.theme;
        seasonSel.value = clean.season;
        syncUrl(clean, 'replace');
      }
    } catch (e) {
      results.innerHTML = CTA.ui.errorBox('DATA_LOAD_FAILED');
      return;
    }
    const kwEl = el.querySelector('#f-keyword');
    function currentFilters() {
      return {
        keyword: kwEl.value,
        province: el.querySelector('#f-province').value,
        theme: el.querySelector('#f-theme').value,
        season: el.querySelector('#f-season').value,
      };
    }
    function persist() { CTA.store.setDiscoverState(currentFilters()); }
    /* 当前筛选状态条：逐项可见、可单项清除，避免用户不知道启用了哪些条件。
       标签文本取自真实数据（省份名、主题 label、季节 label），不编造。 */
    function activeFiltersHtml(filters, hasResults) {
      const items = [];
      if (filters.keyword) items.push({ key: 'keyword', label: '关键词“' + filters.keyword + '”' });
      if (filters.province) items.push({ key: 'province', label: filters.province });
      if (filters.theme) items.push({ key: 'theme', label: (CTA.themeLabels || {})[filters.theme] || filters.theme });
      if (filters.season) items.push({ key: 'season', label: CTA.ui.seasonLabel(filters.season) });
      if (!items.length) return '';
      return '<div class="active-filters" aria-label="当前筛选条件"><span class="active-filters-label">当前筛选：</span>' +
        items.map(it => '<button type="button" class="filter-chip" data-clear-key="' + it.key + '" aria-label="清除筛选：' + esc(it.label) + '">' + esc(it.label) + ' ✕</button>').join('') +
        /* 无结果时空态已有“清除全部筛选”按钮，此处不再重复，避免同一屏出现两个相同操作。 */
        (hasResults ? '<button type="button" class="filter-chip filter-chip-clear" data-clear-filters>清除全部</button>' : '') + '</div>';
    }
    /* ============ B3：旅行灵感中心 ============
       无筛选 → 灵感视图（M1 今日精选 / M2 当季旅行 / M3 主题探索 / M4 小众目的地 /
       M5 旅行新鲜事 / M6 趣味探索 / M7 全部目的地）；
       有筛选 → 结果视图（B2 的 band + 筛选状态 + 结果网格，不变）。
       所有模块只复用正式目的地数据与既有主题/筛选 ID，不新增目的地、不改分类。 */
    const FEATURED_IDS = ['daocheng-yading', 'li-river', 'forbidden-city', 'wuzhen', 'mount-tai'];
    /* 当季旅行：每季 4 条，全部经 bestSeasons 核实；理由取自目的地自身摘要或稳妥的季节体验描述，
       不编造花期/天气/开放时间/活动。 */
    const SEASONAL = {
      spring: [
        { id: 'wuyuan-huangling', reason: '梯田花海铺满山崖，古村落在花季里最有生气。' },
        { id: 'west-lake-hangzhou', reason: '湖堤新绿，适合沿湖慢慢走。' },
        { id: 'suzhou-humble-garden', reason: '江南园林的水景与花木在春天最见精神。' },
        { id: 'li-river', reason: '江水丰盈，峰林倒映，竹筏正当时。' },
      ],
      summer: [
        { id: 'hulunbuir-grassland', reason: '草原正绿，河曲与畜群是最开阔的夏天。' },
        { id: 'qinghai-lake', reason: '湖畔油菜花开，蓝湖与花海同框。' },
        { id: 'huangguoshu-waterfall', reason: '丰水期的瀑布水势最盛。' },
        { id: 'daocheng-yading', reason: '高山草甸与湖泊，是雪山下的夏天。' },
      ],
      autumn: [
        { id: 'jiuzhaigou', reason: '彩林倒映湖面，是一年中色彩最浓的时候。' },
        { id: 'kanas-lake', reason: '湖畔泰加林秋色层叠，林色变化显著。' },
        { id: 'wuyuan-huangling', reason: '晒秋民俗正当时，古村晒满了秋天。' },
        { id: 'hongcun', reason: '秋色里的徽派村落，水系与白墙黛瓦相映。' },
      ],
      winter: [
        { id: 'yalong-bay', reason: '热带海洋气候，冬季相对温暖，适合避寒。' },
        { id: 'harbin-central-street', reason: '冰雪城市的冬天，中央大街最有北方味道。' },
        { id: 'yuanyang-terraces', reason: '冬日梯田水面映天光，是看梯田的好季节。' },
        { id: 'canton-tower', reason: '南国冬日温暖，登高望珠江夜景。' },
      ],
    };
    /* 小众目的地：4 条，选自知名度相对较低的正式目的地（非热门榜单常客），
       理由取自各自摘要中的事实；不声称游客数量、不编造开放/交通状态。 */
    const HIDDEN_GEMS = [
      { id: 'kashgar-old-city', reason: '中亚与本地文化交融的历史街区，喀什的日常比景点更值得看。' },
      { id: 'xijiang-miao-village', reason: '中国现存最大的苗族聚居村寨，十余个村寨依山连片。' },
      { id: 'enshi-grand-canyon', reason: '喀斯特峡谷与绝壁长廊，湖北的另一面。' },
      { id: 'shapotou', reason: '黄河与腾格里沙漠交汇，沙丘、黄河、绿洲同框。' },
    ];
    /* 主题探索代表图：指定代表须确有该主题，否则回退到该主题首条未占用者；snow 无目的地，不展示。 */
    const THEME_REPS = { nature: 'huangshan', mountains: 'zhangjiajie-national-forest-park', coastal: 'gulangyu', historic: 'forbidden-city', 'ancient-town': 'wuzhen', family: 'chengdu-panda-base', photography: 'jiuzhaigou', hiking: 'daocheng-yading', 'grassland-desert': 'hulunbuir-grassland' };
    /* 趣味探索：4 个编辑式问题入口，全部指向既有主题筛选路由。 */
    const FUN_EXPLORATIONS = [
      { title: '想看中国最壮观的山？', desc: '从黄山到稻城亚丁，七座山岳目的地。', theme: 'mountains', imgId: 'huangshan' },
      { title: '哪里的古镇最值得慢慢走？', desc: '八座古镇古城，水乡与山地各有味道。', theme: 'ancient-town', imgId: 'wuzhen' },
      { title: '海岛度假去哪里？', desc: '三处海岛海岸，从厦门到三亚。', theme: 'coastal', imgId: 'gulangyu' },
      { title: '想去徒步？', desc: '六条山岳徒步目的地，峰林与雪山任选。', theme: 'hiking', imgId: 'zhangjiajie-national-forest-park' },
    ];
    let featOffset = 0; /* “换一个精选”的轮换偏移（本页会话内有效） */
    function seasonIdNow() {
      const m = new Date().getMonth() + 1;
      return (m >= 3 && m <= 5) ? 'spring' : (m >= 6 && m <= 8) ? 'summer' : (m >= 9 && m <= 11) ? 'autumn' : 'winter';
    }
    function dayOfYear(d) { return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); }
    function fmtDate(iso) {
      const p = String(iso || '').split('-');
      return p.length === 3 ? p[0] + '年' + (+p[1]) + '月' + (+p[2]) + '日' : String(iso || '');
    }
    function modHead(kicker, title, intro) {
      return '<div class="disc-mod-head"><span class="disc-mod-kicker">' + esc(kicker) + '</span><h3>' + esc(title) + '</h3>' +
        (intro ? '<p class="disc-mod-intro">' + esc(intro) + '</p>' : '') + '</div>';
    }
    function bandHtml(d, kicker, eager) {
      if (!d) return '';
      return '<a class="disc-band" href="#/dest/' + encodeURIComponent(d.id) + '">' +
        '<img src="' + esc(d.coverFull || d.coverThumb || '') + '" alt="' + esc(d.name) + '"' + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' onerror="CTA.imgErr(this,\'card\')">' +
        '<span class="disc-band-cap"><span class="disc-band-kicker">' + esc(kicker) + '</span>' +
        '<span class="disc-band-title">' + esc(d.name) + '</span>' +
        '<span class="disc-band-sub">' + esc(d.province) + (d.city ? ' · ' + esc(d.city) : '') + ' · ' + esc((d.summary || '').length > 44 ? (d.summary || '').slice(0, 44) + '…' : (d.summary || '')) + '</span></span></a>';
    }
    function seasonCards(seasonId) {
      const picks = (SEASONAL[seasonId] || []).map(p => ({ d: index.find(x => x.id === p.id), reason: p.reason })).filter(p => p.d);
      if (!picks.length) return '';
      return '<div class="disc-hscroll">' + picks.map(p =>
        '<a class="season-card" href="#/dest/' + encodeURIComponent(p.d.id) + '">' +
        '<img src="' + esc(p.d.coverThumb || '') + '" alt="' + esc(p.d.name) + '" loading="lazy" onerror="CTA.imgErr(this,\'card\')">' +
        '<span class="season-card-body"><span class="season-card-name">' + esc(p.d.name) + '</span>' +
        '<span class="season-card-place">' + esc(p.d.province) + (p.d.city ? ' · ' + esc(p.d.city) : '') + '</span>' +
        '<span class="season-card-reason">' + esc(p.reason) + '</span></span></a>').join('') + '</div>';
    }
    function themeStrip() {
      if (!themesDoc) return '';
      const used = new Set();
      const cards = [];
      themesDoc.themes.forEach(t => {
        const members = index.filter(d => (d.themes || []).indexOf(t.id) !== -1);
        if (!members.length) return; /* snow：0 个目的地，不展示（内容不足策略） */
        let rep = members.find(d => d.id === THEME_REPS[t.id]);
        if (!rep) rep = members.find(d => !used.has(d.id)) || members[0];
        used.add(rep.id);
        cards.push({ t, rep, count: members.length });
      });
      if (!cards.length) return '';
      return '<div class="disc-hscroll disc-hscroll-themes">' + cards.map(c =>
        '<a class="theme-chip-card" href="#/discover?theme=' + encodeURIComponent(c.t.id) + '">' +
        '<img src="' + esc(c.rep.coverThumb || '') + '" alt="' + esc(c.t.label) + '" loading="lazy" onerror="CTA.imgErr(this,\'card\')">' +
        '<span class="theme-chip-card-body"><span class="theme-chip-card-name">' + esc(c.t.label) + '</span>' +
        '<span class="theme-chip-card-count">' + c.count + ' 个目的地</span></span></a>').join('') + '</div>';
    }
    function gemCards() {
      const picks = HIDDEN_GEMS.map(p => ({ d: index.find(x => x.id === p.id), reason: p.reason })).filter(p => p.d);
      if (!picks.length) return '';
      return '<div class="disc-gem-grid">' + picks.map(p =>
        '<a class="gem-card" href="#/dest/' + encodeURIComponent(p.d.id) + '">' +
        '<img src="' + esc(p.d.coverThumb || '') + '" alt="' + esc(p.d.name) + '" loading="lazy" onerror="CTA.imgErr(this,\'card\')">' +
        '<span class="gem-card-body"><span class="gem-card-name">' + esc(p.d.name) + '</span>' +
        '<span class="gem-card-place">' + esc(p.d.province) + (p.d.city ? ' · ' + esc(p.d.city) : '') + '</span>' +
        '<span class="gem-card-reason">' + esc(p.reason) + '</span></span></a>').join('') + '</div>';
    }
    function newsList() {
      /* 过期过滤：expiresAt 早于今天（本地日期）的条目不展示；按发布时间倒序，最多 5 条。
         缺少标题/来源/链接/发布日期的条目视为无效，不展示。 */
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const valid = (newsItems || []).filter(n =>
        n && n.title && n.source && n.sourceUrl && n.publishedAt &&
        (!n.expiresAt || new Date(n.expiresAt + 'T00:00:00') >= today)
      ).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 5);
      if (!valid.length) return '';
      const byId = {};
      index.forEach(d => { byId[d.id] = d; });
      return '<ul class="disc-news">' + valid.map(n => {
        const rel = n.destId && byId[n.destId] ? byId[n.destId] : null;
        return '<li class="disc-news-item"><span class="disc-news-date">' + esc(fmtDate(n.publishedAt)) + '</span>' +
          '<a class="disc-news-title" href="' + esc(n.sourceUrl) + '" target="_blank" rel="noopener">' + esc(n.title) + '</a>' +
          (n.summary ? '<span class="disc-news-summary">' + esc(n.summary) + '</span>' : '') +
          '<span class="disc-news-meta">来源：' + esc(n.source) +
          (rel ? ' · 相关目的地：<a href="#/dest/' + encodeURIComponent(rel.id) + '">' + esc(rel.name) + '</a>' : '') + '</span></li>';
      }).join('') + '</ul>';
    }
    function funGrid() {
      const cards = FUN_EXPLORATIONS.map(f => {
        const img = index.find(x => x.id === f.imgId);
        const count = index.filter(d => (d.themes || []).indexOf(f.theme) !== -1).length;
        return { f, img, count };
      }).filter(c => c.img && c.count > 0);
      if (!cards.length) return '';
      return '<div class="disc-fun-grid">' + cards.map(c =>
        '<a class="fun-card" href="#/discover?theme=' + encodeURIComponent(c.f.theme) + '">' +
        '<img src="' + esc(c.img.coverThumb || '') + '" alt="" loading="lazy" onerror="CTA.imgErr(this,\'card\')">' +
        '<span class="fun-card-body"><span class="fun-card-q">' + esc(c.f.title) + '</span>' +
        '<span class="fun-card-desc">' + esc(c.f.desc) + '</span></span></a>').join('') + '</div>';
    }
    function render() {
      const filters = currentFilters();
      const hasFilter = !!(filters.keyword || filters.province || filters.theme || filters.season);
      /* 编号：按完整索引位置计算，筛选后同一目的地编号不变 */
      const noOf = d => index.findIndex(x => x.id === d.id) + 1;
      if (hasFilter) { renderResults(filters, noOf); return; }
      renderInspiration(noOf);
    }
    /* 有筛选 → 结果视图（B2 行为不变）：筛选首选 band + 筛选状态 + 结果网格 + 低结果承接区 */
    function renderResults(filters, noOf) {
      let list = CTA.dataService.searchDestinations(index, filters.keyword);
      list = CTA.dataService.filterDestinations(list, filters);
      const band = bandHtml(list[0], '筛选首选', false);
      let more = '';
      if (list.length <= 1) {
        const rest = index.filter(d => !list.some(x => x.id === d.id)).slice(0, 4);
        if (rest.length) more = '<aside class="disc-more"><h3>' + (list.length === 1 ? '仅剩 1 条时看看' : '没有符合条件时看看') + '</h3><p class="muted">以下为正式索引中的其他目的地：</p><ul>' +
          rest.map(d => '<li><a href="#/dest/' + encodeURIComponent(d.id) + '">No.' + String(noOf(d)).padStart(2, '0') + ' ' + esc(d.name) + ' · ' + esc(d.province) + '</a></li>').join('') + '</ul></aside>';
      }
      results.innerHTML = band + activeFiltersHtml(filters, list.length > 0) + (list.length
        ? '<p class="muted">共 ' + list.length + ' 个目的地</p><div class="card-grid">' + list.map(d => CTA.ui.destCard(d, { no: noOf(d) })).join('') + '</div>' + more
        : CTA.ui.emptyState('没有符合条件的目的地', '试试清除某个筛选条件，或等待更多目的地发布。') +
          '<p><button type="button" class="btn" data-clear-filters>清除全部筛选</button></p>' + more);
    }
    /* 无筛选 → 灵感视图：M1-M7。任一模块内容为空时整段隐藏，不留空白大区块。 */
    function renderInspiration(noOf) {
      const featId = FEATURED_IDS[(dayOfYear(new Date()) + featOffset) % FEATURED_IDS.length];
      const feat = index.find(d => d.id === featId);
      const seasonId = seasonIdNow();
      const seasonLabel = CTA.ui.seasonLabel(seasonId);
      const news = newsList();
      const parts = [];
      parts.push('<section class="disc-mod" aria-label="今日精选">' + bandHtml(feat, '今日精选', true) +
        '<div class="disc-mod-foot"><button type="button" class="btn btn-ghost" data-next-featured>换一个精选</button></div></section>');
      const seasonal = seasonCards(seasonId);
      if (seasonal) parts.push('<section class="disc-mod" aria-label="当季旅行">' +
        modHead('SEASON · 当季旅行', seasonLabel + '，适合去这些地方', '按当前季节与目的地实际特点挑选，理由来自目的地本身。') + seasonal + '</section>');
      const themes = themeStrip();
      if (themes) parts.push('<section class="disc-mod" aria-label="主题探索">' +
        modHead('THEMES · 主题探索', '按主题找灵感', '每个主题一张代表图，点击进入对应筛选结果。') + themes + '</section>');
      const gems = gemCards();
      if (gems) parts.push('<section class="disc-mod" aria-label="小众目的地">' +
        modHead('HIDDEN GEMS · 小众目的地', '不在热门榜单上，但值得专程前往', '知名度相对较低的正式目的地，理由全部来自各自的实际特点。') + gems + '</section>');
      if (news) parts.push('<section class="disc-mod" aria-label="旅行新鲜事">' +
        modHead('NEWS · 旅行新鲜事', '最近值得关注的旅行动态', '每条均有可追溯来源与原文链接，过期内容自动隐藏。') + news + '</section>');
      const fun = funGrid();
      if (fun) parts.push('<section class="disc-mod" aria-label="趣味探索">' +
        modHead('EXPLORE · 趣味探索', '不知道去哪？从一个问题开始', '四个问题，通向四个主题筛选。') + fun + '</section>');
      parts.push('<section class="disc-mod" aria-label="全部目的地">' +
        modHead('ALL · 全部目的地', '全部目的地', '共 ' + index.length + ' 个目的地，覆盖 31 个省级地区。') +
        '<div class="card-grid">' + index.map(d => CTA.ui.destCard(d, { no: noOf(d) })).join('') + '</div></section>');
      results.innerHTML = parts.join('');
    }
    el.querySelector('#discover-form').addEventListener('submit', function (e) { e.preventDefault(); render(); persist(); syncUrl(currentFilters(), 'push'); });
    /* 下拉改动即时渲染并入历史（与关键词即时筛选一致；URL 始终与结果集对应）。 */
    ['#f-province', '#f-theme', '#f-season'].forEach(sel => {
      el.querySelector(sel).addEventListener('change', function () { render(); persist(); syncUrl(currentFilters(), 'push'); });
    });
    /* 关键词输入即时筛选（200ms 去抖），不必每次都按“筛选”；回车提交仍立即渲染 */
    let kwTimer = null;
    kwEl.addEventListener('input', function () {
      persist();
      if (kwTimer) clearTimeout(kwTimer);
      kwTimer = setTimeout(function () { kwTimer = null; render(); syncUrl(currentFilters(), 'replace'); }, 200);
    });
    results.addEventListener('click', function (e) {
      const next = e.target.closest('[data-next-featured]');
      if (next) { featOffset = (featOffset + 1) % FEATURED_IDS.length; render(); return; }
      const single = e.target.closest('[data-clear-key]');
      if (single) {
        const key = single.getAttribute('data-clear-key');
        if (key === 'keyword') kwEl.value = '';
        else if (key === 'province') el.querySelector('#f-province').value = '';
        else if (key === 'theme') el.querySelector('#f-theme').value = '';
        else if (key === 'season') el.querySelector('#f-season').value = '';
        render(); persist(); syncUrl(currentFilters(), 'push');
        return;
      }
      if (!e.target.closest('[data-clear-filters]')) return;
      kwEl.value = '';
      el.querySelector('#f-province').value = '';
      el.querySelector('#f-theme').value = '';
      el.querySelector('#f-season').value = '';
      render(); persist(); syncUrl(currentFilters(), 'push');
    });
    render();
    persist();
    /* 无参数进入时把 localStorage 恢复的状态规范化进 URL，使复制当前链接即可分享筛选结果。 */
    if (scrollSource === 'saved') syncUrl(currentFilters(), 'replace');
    /* 滚动位置保存：仅在发现页路由下记录；滚动停稳 150ms 后才写入，
       避免点击卡片前的瞬时滚动（如浏览器将元素滚入视野）覆盖离开前的位置。 */
    let settleTimer = null;
    const onScroll = function () {
      if (!location.hash.startsWith('#/discover')) return;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        settleTimer = null;
        if (location.hash.startsWith('#/discover')) CTA.store.setDiscoverState({ scrollY: window.scrollY });
      }, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    CTA._discScrollCleanup = function () {
      window.removeEventListener('scroll', onScroll);
      if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
    };
    /* 恢复滚动：列表渲染后两帧执行，覆盖路由的初始 scrollTo(0,0)。
       仅在保存状态与历史状态来源下恢复；直接打开分享链接（URL 参数来源）时不恢复旧滚动位置。 */
    if (saved && saved.scrollY > 0 && scrollSource !== 'params') {
      requestAnimationFrame(function () { requestAnimationFrame(function () { window.scrollTo(0, saved.scrollY); }); });
    }
  };
})();
