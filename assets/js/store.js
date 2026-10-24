/* 本地状态：收藏、规划草稿。localStorage 持久化，带 schema 版本，读取失败一律降级为空状态不抛错。 */
(function () {
  window.CTA = window.CTA || {};
  const KEY = 'cta.store.v1';
  const SCHEMA = 1;
  function emptyState() { return { schema: SCHEMA, favorites: [], planDraft: null, discover: null }; }
  function validDiscover(d) {
    if (!d || typeof d !== 'object') return null;
    const s = v => (typeof v === 'string' ? v : '');
    return { keyword: s(d.keyword), province: s(d.province), theme: s(d.theme), season: s(d.season), scrollY: (typeof d.scrollY === 'number' && d.scrollY > 0) ? d.scrollY : 0 };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schema !== SCHEMA || !Array.isArray(parsed.favorites)) return emptyState();
      return { schema: SCHEMA, favorites: parsed.favorites.filter(x => typeof x === 'string'), planDraft: parsed.planDraft || null, discover: validDiscover(parsed.discover) };
    } catch (e) { return emptyState(); }
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { /* 存储不可用时仅内存保留 */ return false; } }
  CTA.store = {
    getFavorites() { return state.favorites.slice(); },
    isFavorite(id) { return state.favorites.indexOf(id) !== -1; },
    toggleFavorite(id) {
      const i = state.favorites.indexOf(id);
      if (i === -1) state.favorites.push(id); else state.favorites.splice(i, 1);
      save();
      return state.favorites.indexOf(id) !== -1;
    },
    getPlanDraft() { return state.planDraft; },
    setPlanDraft(plan) { state.planDraft = plan; return save(); },
    /* 发现页状态（筛选 + 滚动位置）：局部更新合并保存，供详情返回时恢复；损坏或缺失时返回 null。 */
    getDiscoverState() { return state.discover ? Object.assign({}, state.discover) : null; },
    setDiscoverState(patch) {
      const base = state.discover || { keyword: '', province: '', theme: '', season: '', scrollY: 0 };
      state.discover = validDiscover(Object.assign({}, base, patch || {}));
      save();
    },
    clearDiscoverState() { state.discover = null; save(); },
    _resetForTest() { state = emptyState(); save(); },
  };
})();
