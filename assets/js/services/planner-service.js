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

  function planTrip(candidates, input) {
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

    // 贪心分配：按排名依次给每个目的地 min(建议天数上限, 剩余天数)，至少 1 天；剩余天数并入最后一个。
    const chosen = [];
    let remaining = days;
    for (const item of ranked) {
      if (remaining <= 0) break;
      const want = Math.max(1, Math.min((item.d.suggestedDays && item.d.suggestedDays.max) || 1, remaining));
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
