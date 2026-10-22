/* 数据服务层：页面只能经这里按 ID/条件读目的地。筛选/搜索为纯函数，可在 Node 单测。
 * 数据形状：index 为轻量条目 {id,name,province,city,type,themes,bestSeasons,suggestedDays,summary,coverThumb,shard}
 * 详情分片 data/destinations/<shard>.json 为完整记录数组。 */
(function () {
  window.CTA = window.CTA || {};
  const V = (window.CTA.config ? CTA.config.assetV : '0');

  function normalizeText(s) { return String(s == null ? '' : s).toLowerCase(); }

  function searchDestinations(list, keyword) {
    const kw = normalizeText(keyword).trim();
    if (!kw) return list.slice();
    return list.filter(d => [d.name, d.province, d.city, d.district || ''].some(f => normalizeText(f).indexOf(kw) !== -1));
  }

  function filterDestinations(list, filters) {
    const f = filters || {};
    return list.filter(d => {
      if (f.province && d.province !== f.province) return false;
      if (f.city && d.city !== f.city) return false;
      if (f.type && d.type !== f.type) return false;
      if (f.theme && (d.themes || []).indexOf(f.theme) === -1) return false;
      if (f.season && (d.bestSeasons || []).indexOf(f.season) === -1) return false;
      if (f.maxDays != null && d.suggestedDays && d.suggestedDays.min > f.maxDays) return false;
      return true;
    });
  }

  let indexCache = null;
  const shardCache = {};

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new CTA.AppError('DATA_LOAD_FAILED');
    return res.json();
  }

  async function loadIndex() {
    if (indexCache) return indexCache;
    try {
      indexCache = await fetchJson('data/destinations-index.json?v=' + V);
      return indexCache;
    } catch (e) { throw e instanceof CTA.AppError ? e : new CTA.AppError('DATA_LOAD_FAILED', e); }
  }

  async function loadMeta() {
    try { return await fetchJson('data/meta.json?v=' + V); }
    catch (e) { throw new CTA.AppError('DATA_LOAD_FAILED', e); }
  }

  async function loadProvinces() {
    try { return await fetchJson('data/provinces.json?v=' + V); }
    catch (e) { throw new CTA.AppError('DATA_LOAD_FAILED', e); }
  }

  async function loadThemes() {
    try {
      const doc = await fetchJson('data/themes.json?v=' + V);
      CTA.themeLabels = {};
      (doc.themes || []).forEach(t => { CTA.themeLabels[t.id] = t.label; });
      return doc;
    } catch (e) { throw new CTA.AppError('DATA_LOAD_FAILED', e); }
  }

  async function getById(id) {
    const index = await loadIndex();
    const entry = index.find(d => d.id === id);
    if (!entry) throw new CTA.AppError('DATA_NOT_FOUND');
    const shardName = entry.shard;
    if (!shardCache[shardName]) {
      shardCache[shardName] = await fetchJson('data/destinations/' + encodeURIComponent(shardName) + '.json?v=' + V);
    }
    const full = shardCache[shardName].find(d => d.id === id);
    if (!full) throw new CTA.AppError('DATA_NOT_FOUND');
    return full;
  }

  CTA.dataService = { loadIndex, loadMeta, loadProvinces, loadThemes, getById, searchDestinations, filterDestinations };
  if (typeof module !== 'undefined' && module.exports) module.exports = { searchDestinations, filterDestinations };
})();
