/* China Travel Atlas — 全局配置（唯一版本与开关来源） */
window.CTA = window.CTA || {};
CTA.config = {
  version: '0.1.0',
  assetV: '20261022e', // 静态资源缓存版本：改任何 CSS/JS/数据后必须与 index.html、sw.js 同步递增
  dataVersion: '2026-10-22',
  nav: [
    { id: 'home', label: '首页', route: '#/', icon: '🧭' },
    { id: 'discover', label: '发现', route: '#/discover', icon: '🔎' },
    { id: 'planner', label: '规划', route: '#/planner', icon: '🗓️' },
    { id: 'favorites', label: '收藏', route: '#/favorites', icon: '⭐' },
  ],
  tabs: [
    { id: 'home', label: '首页', route: '#/', icon: '🧭' },
    { id: 'discover', label: '发现', route: '#/discover', icon: '🔎' },
    { id: 'planner', label: '规划', route: '#/planner', icon: '🗓️' },
    { id: 'favorites', label: '收藏', route: '#/favorites', icon: '⭐' },
  ],
  features: {
    // 天气：一期联调用 Open-Meteo（无密钥、仅非商业原型）；生产主选和风须经 Worker 代理，见 worker/weather-proxy/
    weatherEnabled: false, // 第一版关闭（2026-10-22 发布决策）：生产天气链路未验证，详情页显示明确不可用；代码与降级逻辑保留
    weatherProvider: 'open-meteo', // 'open-meteo' | 'worker-qweather'
    weatherWorkerBase: '', // provider=worker-qweather 时填自有 Worker 域名；密钥永不进前端
    aiPlannerEnabled: false, // 二期功能，一期关闭且不预埋任何密钥
  },
  weatherCacheTtlMs: {
    current: 30 * 60 * 1000,
    hourly: 60 * 60 * 1000,
    daily: 3 * 60 * 60 * 1000,
  },
};
