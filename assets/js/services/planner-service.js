/* 规则行程规划（纯函数，无网络、无 AI）：按主题/季节给候选目的地打分，
 * 按建议天数把总天数分配到各目的地，生成逐日草案。人数与预算只影响排序权重与提示，不改变日期结构。 */
(function () {
  function scoreDestination(d, prefs) {
    let score = 0;
    if (prefs.theme && (d.themes || []).indexOf(prefs.theme) !== -1) score += 10;
    if (prefs.season && (d.bestSeasons || []).indexOf(prefs.season) !== -1) score += 6;
    if (prefs.province && d.province === prefs.province) score += 3;
    return score;
  }

  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  /* planTrip(candidates, input, geoApi?)
   * geoApi（可选，页面传入 CTA.plannerGeo）：提供 orderByGeography 时，在打分排序后按分数分层做地理排序；
   * 不传或无该方法时退回原有分数+名称顺序。input.pinned（可选，目的地 ID 数组）：用户明确指定的目的地，
   * 按给定顺序置于最前且不参与重排、不得被删除；其余候选仍按分数分层地理排序。 */
  function planTrip(candidates, input, geoApi) {
    const days = input && input.days;
    if (!Number.isInteger(days) || days < 1 || days > 30) {
      return { ok: false, error: 'INVALID_INPUT', message: '天数须为 1–30 的整数' };
    }
    if (!input.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || isNaN(Date.parse(input.startDate + 'T00:00:00Z'))) {
      return { ok: false, error: 'INVALID_INPUT', message: '出发日期格式须为 YYYY-MM-DD' };
    }
    const prefs = { theme: input.theme || '', season: input.season || '', province: input.province || '' };
    const ranked = (candidates || []).slice()
      .map(d => ({ d, s: scoreDestination(d, prefs) }))
      .sort((a, b) => b.s - a.s || a.d.name.localeCompare(b.d.name, 'zh'));
    if (!ranked.length) return { ok: false, error: 'EMPTY_RESULT', message: '暂无已发布的目的地可用于规划' };

    /* B4.1：地理感知排序。先抽出 pinned（用户指定顺序，不得擅自改变）；其余按分数分层地理排序；
     * 无 geoApi 时保持原有顺序。分配逻辑不变，仍按建议天数贪心分配。 */
    let ordered = ranked;
    const pinnedIds = (input && Array.isArray(input.pinned)) ? input.pinned.filter(id => typeof id === 'string' && id) : [];
    let pinned = [];
    if (pinnedIds.length) {
      const byId = {};
      ranked.forEach(item => { byId[item.d.id] = item; });
      pinned = pinnedIds.map(id => byId[id]).filter(Boolean);
      ordered = ranked.filter(item => pinnedIds.indexOf(item.d.id) === -1);
    }
    if (geoApi && typeof geoApi.orderByGeography === 'function') {
      ordered = geoApi.orderByGeography(ordered);
    }
    ordered = pinned.concat(ordered);

    // 贪心分配：按排名依次给每个目的地 min(建议天数上限, 剩余天数)，至少 1 天；剩余天数并入最后一个。
    // pinned 必须完整保留：为每个尚未分配的 pinned 目的地预留至少 1 天（pinned 在 ordered 最前，故只影响 pinned 段）。
    const chosen = [];
    let remaining = days;
    for (let oi = 0; oi < ordered.length; oi++) {
      if (remaining <= 0) break;
      const item = ordered[oi];
      const pinnedAfter = oi < pinned.length ? pinned.length - 1 - oi : 0;
      const want = Math.max(1, Math.min((item.d.suggestedDays && item.d.suggestedDays.max) || 1, remaining - pinnedAfter));
      chosen.push({ dest: item.d, days: want });
      remaining -= want;
    }
    if (remaining > 0 && chosen.length) chosen[chosen.length - 1].days += remaining;

    const itinerary = [];
    let cursor = input.startDate;
    for (const c of chosen) {
      for (let i = 0; i < c.days; i++) {
        itinerary.push({
          date: cursor,
          destinationId: c.dest.id,
          destinationName: c.dest.name,
          activities: (c.dest.activities || []).slice(0, 3),
        });
        cursor = addDays(cursor, 1);
      }
    }
    return {
      ok: true,
      startDate: input.startDate,
      days,
      people: input.people || null,
      budgetTier: input.budgetTier || null,
      itinerary,
      totalDays: itinerary.length,
    };
  }

  const api = { planTrip, scoreDestination, addDays };
  if (typeof window !== 'undefined') { window.CTA = window.CTA || {}; CTA.plannerService = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
