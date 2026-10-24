/* 行程编辑纯函数（无 DOM、无网络）：按天上移/下移/新增/删除。
 * 语义：重排只交换两天的目的地三字段，日期序列不变；增删后后续日期顺延。
 * 所有函数不改原数组，非法输入返回 {ok:false,error:'INVALID_INPUT'}，不抛错。 */
(function () {
  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function copyDay(d) {
    return { date: d.date, destinationId: d.destinationId, destinationName: d.destinationName, activities: (d.activities || []).slice() };
  }
  function validItinerary(it) {
    return Array.isArray(it) && it.every(d => d && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date)
      && typeof d.destinationId === 'string' && d.destinationId
      && typeof d.destinationName === 'string' && d.destinationName);
  }
  function fail() { return { ok: false, error: 'INVALID_INPUT' }; }

  function moveDay(itinerary, index, dir) {
    if (!validItinerary(itinerary)) return fail();
    if (!Number.isInteger(index) || index < 0 || index >= itinerary.length) return fail();
    if (dir !== 1 && dir !== -1) return fail();
    const j = index + dir;
    if (j < 0 || j >= itinerary.length) return fail();
    const next = itinerary.map(copyDay);
    const a = next[index], b = next[j];
    const tId = a.destinationId, tName = a.destinationName, tAct = a.activities;
    a.destinationId = b.destinationId; a.destinationName = b.destinationName; a.activities = b.activities;
    b.destinationId = tId; b.destinationName = tName; b.activities = tAct;
    return { ok: true, itinerary: next };
  }

  function insertDay(itinerary, afterIndex, dest, startDate) {
    if (!validItinerary(itinerary)) return fail();
    if (!Number.isInteger(afterIndex)) return fail();
    if (!dest || typeof dest.id !== 'string' || !dest.id || typeof dest.name !== 'string' || !dest.name) return fail();
    const next = itinerary.map(copyDay);
    let newDate;
    if (next.length === 0) {
      if (afterIndex !== -1 || !startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return fail();
      newDate = startDate;
    } else {
      if (afterIndex < 0 || afterIndex >= next.length) return fail();
      newDate = addDays(next[afterIndex].date, 1);
      for (let i = afterIndex + 1; i < next.length; i++) next[i].date = addDays(next[i].date, 1);
    }
    next.splice(afterIndex + 1, 0, { date: newDate, destinationId: dest.id, destinationName: dest.name, activities: (dest.activities || []).slice(0, 3) });
    return { ok: true, itinerary: next };
  }

  function removeDay(itinerary, index) {
    if (!validItinerary(itinerary)) return fail();
    if (!Number.isInteger(index) || index < 0 || index >= itinerary.length) return fail();
    const next = itinerary.map(copyDay);
    next.splice(index, 1);
    for (let i = index; i < next.length; i++) next[i].date = addDays(next[i].date, -1);
    return { ok: true, itinerary: next };
  }

  const api = { moveDay, insertDay, removeDay, addDays };
  if (typeof window !== 'undefined') { window.CTA = window.CTA || {}; CTA.plannerEdit = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
