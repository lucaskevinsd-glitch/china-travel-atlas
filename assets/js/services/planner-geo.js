/* 地理距离感知（纯函数，无 DOM、无网络）：Haversine 直线距离 + 行程合理性检测 + 顺路重排建议。
 * 只用直线距离；不编造道路距离与交通时间。所有阈值集中在本文件 GEO，页面只读检测结果。
 * 坐标来自目的地 location（WGS-84，景区坐标）；坐标缺失时标记为无法计算，不编造。
 * 判定依据是实际地理距离，不只看是否跨省（同省可远如喀什→喀纳斯 1358km，跨省可近如宏村→篁岭 77km）。 */
(function () {
  var EARTH_R_KM = 6371;

  var GEO = {
    /* 相邻两天（过夜转移）的直线距离分级（km）。
       校准依据（实测 Haversine）：同市 22km / 同省近 65–156km / 北京→平遥 475km /
       北京→沈阳 629km / 北京→上海 1069km / 拉萨→成都 1256km（B0 案例）/ 哈尔滨→亚龙湾 3440km。 */
    adjacent: { info: 300, warn: 800, severe: 1500 },
    /* 同一天多个目的地的直线距离分级（km）。当前模型每天 1 个目的地，此为防御性检测。 */
    sameDay: { info: 80, warn: 200, severe: 400 },
    /* 绕路：连续三天 A→B→C，若经 B 的路程比 A→C 直达长出该比例且绝对值超限，提示可能绕路。 */
    detour: { ratio: 2, extraKm: 300 },
    /* 重排建议：最近邻顺序（首日固定）比当前顺序省出该距离且比例超限时才建议。 */
    reorder: { minSavedKm: 200, minSavedPct: 0.2 },
  };

  function haversineKm(a, b) {
    if (!a || !b) return null;
    if (typeof a.lat !== 'number' || typeof a.lng !== 'number' ||
        typeof b.lat !== 'number' || typeof b.lng !== 'number') return null;
    if (a.lat < -90 || a.lat > 90 || a.lng < -180 || a.lng > 180 ||
        b.lat < -90 || b.lat > 90 || b.lng < -180 || b.lng > 180) return null;
    var la1 = a.lat * Math.PI / 180, lo1 = a.lng * Math.PI / 180;
    var la2 = b.lat * Math.PI / 180, lo2 = b.lng * Math.PI / 180;
    var dla = la2 - la1, dlo = lo2 - lo1;
    var h = Math.sin(dla / 2) * Math.sin(dla / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dlo / 2) * Math.sin(dlo / 2);
    return 2 * EARTH_R_KM * Math.asin(Math.sqrt(Math.min(1, h)));
  }

  /* 从目的地/索引条目取坐标；缺失或非法返回 null（调用方标记为无法计算）。 */
  function coordOf(dest) {
    var loc = dest && dest.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
    if (loc.lat < -90 || loc.lat > 90 || loc.lng < -180 || loc.lng > 180) return null;
    return { lat: loc.lat, lng: loc.lng };
  }

  function levelFor(km, t) {
    if (km == null) return null;
    if (km > t.severe) return 'severe';
    if (km > t.warn) return 'warn';
    if (km > t.info) return 'info';
    return null;
  }

  function fmtKm(km) {
    return km == null ? '未知' : (km >= 100 ? String(Math.round(km)) : km.toFixed(0)) + ' 公里';
  }

  function coordOfId(coordMap, id) {
    if (!coordMap) return null;
    if (typeof coordMap.get === 'function') return coordMap.get(id) || null;
    return coordMap[id] || null;
  }

  /* 分析行程。itinerary: [{date, destinationId, destinationName}]；coordMap: id -> {lat,lng}|null。
     返回 { legs, issues, totalKm }；legs 为相邻两天的转移（含 km 或 null），issues 按 dayIndex 排序。 */
  function analyzeItinerary(itinerary, coordMap) {
    var days = Array.isArray(itinerary) ? itinerary : [];
    var coords = days.map(function (d) { return coordOfId(coordMap, d.destinationId); });
    var issues = [];
    var legs = [];
    var totalKm = 0;

    /* 坐标缺失：明确标记，级别为提示（信息性，不阻塞）。 */
    days.forEach(function (d, i) {
      if (!coords[i]) {
        issues.push({
          key: 'missing:' + i,
          level: 'info',
          kind: 'missing',
          dayIndex: i,
          title: '该目的地暂无坐标',
          detail: '「' + d.destinationName + '」暂无可用坐标，无法计算它与前后行程的距离。',
          suggestion: '可继续按原计划，或更换为有坐标的目的地以便核对距离。',
        });
      }
    });

    /* 相邻两天转移。同日期的两条不走此规则（由同日检测覆盖）。 */
    for (var i = 0; i + 1 < days.length; i++) {
      if (days[i].date === days[i + 1].date) { legs.push({ fromIndex: i, toIndex: i + 1, km: null }); continue; }
      var km = haversineKm(coords[i], coords[i + 1]);
      legs.push({ fromIndex: i, toIndex: i + 1, km: km });
      if (km != null) totalKm += km;
      var lv = levelFor(km, GEO.adjacent);
      if (!lv) continue;
      var a = days[i], b = days[i + 1];
      var base = '「' + a.destinationName + '」到「' + b.destinationName + '」直线距离约 ' + fmtKm(km) + '。';
      var sugg = lv === 'info'
        ? '建议提前安排两地之间的交通。'
        : lv === 'warn'
          ? '衔接较困难，建议调整顺序，或为这段转移预留充足的交通时间。'
          : '相邻两天安排如此远的跨越不符合常规旅行安排，请确认是否确实如此，或调整行程。';
      issues.push({
        key: 'adj:' + i + ':' + (i + 1),
        level: lv,
        kind: 'adjacent',
        dayIndex: i + 1,
        title: lv === 'info' ? '两地距离较远' : lv === 'warn' ? '行程衔接较困难' : '跨越距离过大',
        detail: base,
        suggestion: sugg,
      });
    }

    /* 同一天多个目的地（防御性：当前模型每天 1 个目的地，正常不触发）。 */
    var byDate = {};
    days.forEach(function (d, i) { (byDate[d.date] = byDate[d.date] || []).push(i); });
    Object.keys(byDate).forEach(function (date) {
      var idxs = byDate[date];
      if (idxs.length < 2) return;
      var maxKm = null;
      for (var a = 0; a < idxs.length; a++) {
        for (var b = a + 1; b < idxs.length; b++) {
          var k = haversineKm(coords[idxs[a]], coords[idxs[b]]);
          if (k != null && (maxKm == null || k > maxKm)) maxKm = k;
        }
      }
      var lv2 = levelFor(maxKm, GEO.sameDay);
      if (!lv2) return;
      var names = idxs.map(function (i) { return '「' + days[i].destinationName + '」'; }).join('、');
      issues.push({
        key: 'same:' + date,
        level: lv2,
        kind: 'same-day',
        dayIndex: idxs[0],
        title: lv2 === 'info' ? '同一天行程较赶' : lv2 === 'warn' ? '同一天跨越较远' : '同一天无法兼顾',
        detail: date + ' 同一天安排了 ' + names + '，最远相距约 ' + fmtKm(maxKm) + '（直线距离）。',
        suggestion: lv2 === 'severe' ? '同一天内难以兼顾相距如此远的地点，建议分到不同日期。' : '建议把相距较远的地点分到不同日期，或预留充足的当日交通时间。',
      });
    });

    /* 绕路：连续三天 A→B→C，经 B 比 A→C 直达长出 detour.ratio 倍且多出 detour.extraKm 以上。 */
    for (var j = 0; j + 2 < days.length; j++) {
      var dAB = haversineKm(coords[j], coords[j + 1]);
      var dBC = haversineKm(coords[j + 1], coords[j + 2]);
      var dAC = haversineKm(coords[j], coords[j + 2]);
      if (dAB == null || dBC == null || dAC == null) continue;
      var via = dAB + dBC;
      if (via > dAC * GEO.detour.ratio && via - dAC > GEO.detour.extraKm) {
        issues.push({
          key: 'detour:' + j,
          level: 'info',
          kind: 'detour',
          dayIndex: j + 1,
          title: '第 ' + (j + 2) + ' 天可能绕路',
          detail: '「' + days[j].destinationName + '」到「' + days[j + 2].destinationName + '」直线仅约 ' + fmtKm(dAC) +
            '，经「' + days[j + 1].destinationName + '」则约 ' + fmtKm(via) + '。',
          suggestion: '可考虑调整这三天的顺序，或查看下方的顺路重排建议。',
        });
      }
    }

    issues.sort(function (x, y) { return x.dayIndex - y.dayIndex; });
    return { legs: legs, issues: issues, totalKm: Math.round(totalKm) };
  }

  /* 最近邻重排建议（首日固定为出发点）。返回 null 表示当前顺序已足够顺路或无法计算。 */
  function suggestOrder(itinerary, coordMap) {
    var days = Array.isArray(itinerary) ? itinerary : [];
    if (days.length < 3) return null;
    var coords = days.map(function (d) { return coordOfId(coordMap, d.destinationId); });
    if (coords.some(function (c) { return !c; })) return null;
    function pathKm(order) {
      var s = 0;
      for (var i = 0; i + 1 < order.length; i++) {
        var k = haversineKm(coords[order[i]], coords[order[i + 1]]);
        if (k == null) return null;
        s += k;
      }
      return s;
    }
    var current = days.map(function (_, i) { return i; });
    var curKm = pathKm(current);
    if (curKm == null) return null;
    var order = [0];
    var rest = current.slice(1);
    while (rest.length) {
      var last = order[order.length - 1];
      var best = rest[0], bestKm = Infinity;
      rest.forEach(function (i) {
        var k = haversineKm(coords[last], coords[i]);
        if (k != null && k < bestKm) { bestKm = k; best = i; }
      });
      order.push(best);
      rest.splice(rest.indexOf(best), 1);
    }
    var newKm = pathKm(order);
    if (newKm == null) return null;
    var savedKm = curKm - newKm;
    var savedPct = curKm > 0 ? savedKm / curKm : 0;
    if (savedKm <= GEO.reorder.minSavedKm || savedPct <= GEO.reorder.minSavedPct) return null;
    if (order.every(function (v, i) { return v === i; })) return null;
    return {
      order: order,
      currentKm: Math.round(curKm),
      newKm: Math.round(newKm),
      savedKm: Math.round(savedKm),
      savedPct: Math.round(savedPct * 100),
    };
  }

  /* 按建议顺序重排：日期序列不变，只把目的地三字段按 order 重新分配。order[i] 为原第几天的目的地放到新第 i 天。 */
  function applyOrder(itinerary, order) {
    var days = Array.isArray(itinerary) ? itinerary : [];
    if (!Array.isArray(order) || order.length !== days.length) return null;
    var sorted = order.slice().sort(function (a, b) { return a - b; });
    for (var i = 0; i < sorted.length; i++) if (sorted[i] !== i) return null;
    return days.map(function (d, i) {
      var src = days[order[i]];
      return {
        date: d.date,
        destinationId: src.destinationId,
        destinationName: src.destinationName,
        activities: (src.activities || []).slice(),
      };
    });
  }

  /* B4.1：按分数分层做地理排序（生成器用）。
   * 输入：scored（[{d, s}]，已按分数降序、同分按名称排序）；输出：同结构新数组。
   * 每层内：有坐标者按“最密集点出发、最近邻”排序；无坐标者保留在本层末尾、相对顺序不变。
   * 密集点 = 层内 300km（GEO.adjacent.info）邻居最多的目的地；并列时取原顺序在先者。
   * 不改变分数分层（用户偏好优先），不删除任何候选，不编造距离。 */
  function orderByGeography(scored) {
    var list = Array.isArray(scored) ? scored.slice() : [];
    if (!list.length) return list;
    var groups = [];
    list.forEach(function (item) {
      var g = groups[groups.length - 1];
      if (!g || g.score !== item.s) { g = { score: item.s, items: [] }; groups.push(g); }
      g.items.push(item);
    });
    var out = [];
    groups.forEach(function (g) {
      var withCoord = [], withoutCoord = [];
      g.items.forEach(function (item) {
        (coordOf(item.d) ? withCoord : withoutCoord).push(item);
      });
      if (withCoord.length <= 1) { out.push.apply(out, g.items); return; }
      var coords = withCoord.map(function (item) { return coordOf(item.d); });
      var radius = GEO.adjacent.info;
      var best = 0, bestCount = -1;
      withCoord.forEach(function (item, i) {
        var n = 0;
        coords.forEach(function (c, j) {
          if (i === j) return;
          var k = haversineKm(coords[i], c);
          if (k != null && k <= radius) n++;
        });
        if (n > bestCount) { bestCount = n; best = i; }
      });
      var chain = [withCoord[best]];
      var rest = withCoord.filter(function (_, i) { return i !== best; });
      var restCoords = coords.filter(function (_, i) { return i !== best; });
      while (rest.length) {
        var last = coordOf(chain[chain.length - 1].d);
        var bi = 0, bk = Infinity;
        restCoords.forEach(function (c, i) {
          var k = haversineKm(last, c);
          if (k != null && k < bk) { bk = k; bi = i; }
        });
        chain.push(rest[bi]);
        rest.splice(bi, 1);
        restCoords.splice(bi, 1);
      }
      out.push.apply(out, chain.concat(withoutCoord));
    });
    return out;
  }

  var api = { GEO: GEO, haversineKm: haversineKm, coordOf: coordOf, analyzeItinerary: analyzeItinerary, suggestOrder: suggestOrder, applyOrder: applyOrder, orderByGeography: orderByGeography };
  if (typeof window !== 'undefined') { window.CTA = window.CTA || {}; CTA.plannerGeo = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
