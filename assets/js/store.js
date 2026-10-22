/* 本地状态：收藏、规划草稿。localStorage 持久化，带 schema 版本，读取失败一律降级为空状态不抛错。 */
(function () {
  window.CTA = window.CTA || {};
  const KEY = 'cta.store.v1';
  const SCHEMA = 1;
  function emptyState() { return { schema: SCHEMA, favorites: [], planDraft: null }; }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schema !== SCHEMA || !Array.isArray(parsed.favorites)) return emptyState();
      return { schema: SCHEMA, favorites: parsed.favorites.filter(x => typeof x === 'string'), planDraft: parsed.planDraft || null };
    } catch (e) { return emptyState(); }
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 存储不可用时仅内存保留 */ } }
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
    setPlanDraft(plan) { state.planDraft = plan; save(); },
    _resetForTest() { state = emptyState(); save(); },
  };
})();
