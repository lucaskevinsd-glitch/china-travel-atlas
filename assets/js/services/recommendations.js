/* 目的地关联推荐（纯函数，无 DOM、无网络）：三层——附近 / 相似体验 / 延伸探索。
 * 复用 planner-geo 的 haversineKm / coordOf（由调用方以 geoApi 传入）；不自建第二套距离计算。
 * 只用直线距离；不编造道路距离与交通时间。所有权重集中在本文件 REC。
 * 数据依据只用索引条目字段（province/city/type/themes/bestSeasons/location）；
 * 缺失坐标者可参与主题推荐，但不伪造距离；缺失主题者不虚构匹配关系。
 * 当前目的地不推荐自己；三层之间不重复；匹配不足时减少展示，不凑数。 */
(function () {
  var SEASON_LABELS = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };

  var REC = {
    /* M1 附近：300km 内（与 B4 相邻日 info 级一致：300km 内属可顺路转移），按距离升序，至多 4 张。 */
    nearby: { maxKm: 300, limit: 4 },
    /* M2 相似体验：共同主题按频次加权（稀有主题更能代表体验：≤8 条=3 分、≤20 条=2 分、>20 条=1 分，
       由本轮 42 条实测：mountains/hiking/ancient-town/coastal/grassland-desert=3，nature=2，historic/family/photography=1）、
       同类型 +3；阈值 4 分（2 个通用主题=2 分不足，1 个稀有主题+同类型=6 分足）；至多 4 张；同一类型至多 3 张（保多样性）。 */
    similar: { type: 3, threshold: 4, limit: 4, maxPerType: 3 },
    /* M3 延伸探索：同省 +3、同市 +2（与同省叠加）、共同主题按 M2 同款频次加权、500km 内 +1；阈值 3 分；至多 4 张。 */
    extended: { province: 3, city: 2, nearKm: 500, nearBonus: 1, threshold: 3, limit: 4 },
  };

  /* 主题权重（频次加权，动态计算：稀有主题更能代表旅行体验）。 */
  function themeWeights(entries) {
    var df = {};
    (entries || []).forEach(function (e) { (e.themes || []).forEach(function (t) { df[t] = (df[t] || 0) + 1; }); });
    var w = {};
    Object.keys(df).forEach(function (t) { w[t] = df[t] <= 8 ? 3 : df[t] <= 20 ? 2 : 1; });
    return w;
  }

  function themeLabel(labels, id) {
    return (labels && labels.themes && labels.themes[id]) || id;
  }
  function typeLabel(labels, id) {
    return (labels && labels.types && labels.types[id]) || id;
  }
  function fmtKm(km) {
    return km == null ? '未知' : (km >= 100 ? String(Math.round(km)) : km.toFixed(0)) + ' 公里';
  }
  function sharedThemes(a, b) {
    var set = {};
    (a.themes || []).forEach(function (t) { set[t] = true; });
    return (b.themes || []).filter(function (t) { return set[t]; });
  }

  function reasonNearby(cur, e, km) {
    var parts = ['直线距离约 ' + fmtKm(km)];
    if (e.city && cur.city && e.city === cur.city) parts.push('同在' + e.city);
    else if (e.province && cur.province && e.province === cur.province) parts.push('同在' + e.province);
    return parts.join('，');
  }
  function reasonSimilar(cur, e, shared, labels) {
    var parts = [];
    if (shared.length) parts.push('共同主题：' + shared.map(function (t) { return themeLabel(labels, t); }).join('、'));
    if (e.type && cur.type && e.type === cur.type) parts.push('同为' + typeLabel(labels, e.type));
    return parts.join('；');
  }
  function reasonExtended(cur, e, shared, km, labels) {
    var parts = [];
    if (e.city && cur.city && e.city === cur.city) parts.push('同在' + e.city);
    else if (e.province && cur.province && e.province === cur.province) parts.push('同在' + e.province);
    if (shared.length) parts.push('同属「' + shared.slice(0, 2).map(function (t) { return themeLabel(labels, t); }).join('、') + '」主题');
    if (km != null) parts.push('直线距离约 ' + fmtKm(km));
    return parts.join('；');
  }

  /* entries：索引条目数组；currentId：当前目的地；geoApi：planner-geo（可选，无则 M1 为空且 M3 无距离加分）；
     labels：{themes, types}（可选，无则用原始 id）。
     返回 { nearby: [{dest, km, reason}], similar: [{dest, score, reason}], extended: [{dest, score, reason}] }。
     排序稳定（分数/距离相同时按索引原顺序），结果可复现。 */
  function getRecommendations(entries, currentId, geoApi, labels) {
    var list = Array.isArray(entries) ? entries : [];
    var cur = null, curIndex = -1;
    list.forEach(function (e, i) { if (e.id === currentId && !cur) { cur = e; curIndex = i; } });
    if (!cur) return { nearby: [], similar: [], extended: [] };
    var hasGeo = !!(geoApi && typeof geoApi.haversineKm === 'function' && typeof geoApi.coordOf === 'function');
    var curCoord = hasGeo ? geoApi.coordOf(cur) : null;
    var tW = themeWeights(list);
    var used = {};
    used[currentId] = true;

    /* M1 附近：有坐标者按直线距离升序，300km 内，至多 4。 */
    var nearby = [];
    if (hasGeo && curCoord) {
      list.forEach(function (e, i) {
        if (e.id === currentId) return;
        var c = geoApi.coordOf(e);
        if (!c) return;
        var km = geoApi.haversineKm(curCoord, c);
        if (km == null || km > REC.nearby.maxKm) return;
        nearby.push({ dest: e, km: km, reason: reasonNearby(cur, e, km), _i: i });
      });
      nearby.sort(function (a, b) { return a.km - b.km || a._i - b._i; });
      nearby = nearby.slice(0, REC.nearby.limit);
      nearby.forEach(function (x) { used[x.dest.id] = true; delete x._i; });
    }

    /* M2 相似体验：共同主题与同类型计分，阈值以上按分数降序，同一类型至多 3 张。 */
    var similar = [];
    list.forEach(function (e, i) {
      if (used[e.id]) return;
      var shared = sharedThemes(cur, e);
      var score = shared.reduce(function (a, t) { return a + (tW[t] || 0); }, 0) +
        ((e.type && cur.type && e.type === cur.type) ? REC.similar.type : 0);
      if (score < REC.similar.threshold) return;
      similar.push({ dest: e, score: score, reason: reasonSimilar(cur, e, shared, labels), _i: i });
    });
    similar.sort(function (a, b) { return b.score - a.score || a._i - b._i; });
    var perType = {};
    similar = similar.filter(function (x) {
      var t = x.dest.type || '';
      perType[t] = (perType[t] || 0) + 1;
      return perType[t] <= REC.similar.maxPerType;
    }).slice(0, REC.similar.limit);
    similar.forEach(function (x) { used[x.dest.id] = true; delete x._i; });

    /* M3 延伸探索：同地区 / 同主题计分，阈值以上按分数降序；500km 内有坐标者加 1 分（无坐标不加分、不伪造）。 */
    var extended = [];
    list.forEach(function (e, i) {
      if (used[e.id]) return;
      var shared = sharedThemes(cur, e);
      var score = 0;
      if (e.province && cur.province && e.province === cur.province) score += REC.extended.province;
      if (e.city && cur.city && e.city === cur.city) score += REC.extended.city;
      score += shared.reduce(function (a, t) { return a + (tW[t] || 0); }, 0);
      var km = null;
      if (hasGeo && curCoord) {
        var c = geoApi.coordOf(e);
        if (c) {
          km = geoApi.haversineKm(curCoord, c);
          if (km != null && km <= REC.extended.nearKm) score += REC.extended.nearBonus;
        }
      }
      if (score < REC.extended.threshold) return;
      extended.push({ dest: e, score: score, reason: reasonExtended(cur, e, shared, km, labels), _i: i });
    });
    extended.sort(function (a, b) { return b.score - a.score || a._i - b._i; });
    extended = extended.slice(0, REC.extended.limit);
    extended.forEach(function (x) { delete x._i; });

    return { nearby: nearby, similar: similar, extended: extended };
  }

  var api = { REC: REC, SEASON_LABELS: SEASON_LABELS, getRecommendations: getRecommendations };
  if (typeof window !== 'undefined') { window.CTA = window.CTA || {}; CTA.recommendations = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
