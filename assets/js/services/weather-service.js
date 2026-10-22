/* 天气服务层：原始供应商响应只在这里归一化，页面只拿内部模型。
 * 内部模型: { provider, updatedAt(ISO), current:{temp,feelsLike,weatherCode,humidity,windSpeed},
 *             daily:[{date,tempMax,tempMin,weatherCode,precipProb}], stale:boolean }
 * 策略：缓存(localStorage, TTL 见 config) → 请求(5s 超时) → 失败用未过期/过期缓存兜底 → 再失败抛 WEATHER_UNAVAILABLE。 */
(function () {
  const CACHE_PREFIX = 'cta.weather.v1.';

  function normalizeOpenMeteo(raw, nowIso) {
    if (!raw || !raw.current || !raw.daily) throw new Error('bad open-meteo payload');
    const daily = (raw.daily.time || []).map((date, i) => ({
      date,
      tempMax: raw.daily.temperature_2m_max ? raw.daily.temperature_2m_max[i] : null,
      tempMin: raw.daily.temperature_2m_min ? raw.daily.temperature_2m_min[i] : null,
      weatherCode: raw.daily.weather_code ? raw.daily.weather_code[i] : null,
      precipProb: raw.daily.precipitation_probability_max ? raw.daily.precipitation_probability_max[i] : null,
    }));
    return {
      provider: 'open-meteo',
      updatedAt: raw.current.time || nowIso,
      fetchedAt: nowIso,
      current: {
        temp: raw.current.temperature_2m,
        feelsLike: raw.current.apparent_temperature,
        weatherCode: raw.current.weather_code,
        humidity: raw.current.relative_humidity_2m,
        windSpeed: raw.current.wind_speed_10m,
      },
      daily,
      stale: false,
    };
  }

  function cacheKey(destId) { return CACHE_PREFIX + destId; }
  function readCache(destId) {
    try {
      const raw = localStorage.getItem(cacheKey(destId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data || !parsed.savedAt) return null;
      return parsed;
    } catch (e) { return null; }
  }
  function writeCache(destId, data) {
    try { localStorage.setItem(cacheKey(destId), JSON.stringify({ savedAt: Date.now(), data })); } catch (e) { /* 忽略 */ }
  }
  function isFresh(savedAt, ttlMs) { return Date.now() - savedAt < ttlMs; }

  async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { signal: ctrl.signal }); }
    finally { clearTimeout(t); }
  }

  async function fetchOpenMeteo(dest) {
    const lat = dest.location.lat, lng = dest.location.lng;
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) +
      '&longitude=' + encodeURIComponent(lng) +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=Asia%2FShanghai&forecast_days=7';
    const res = await fetchWithTimeout(url, 5000);
    if (!res.ok) throw new Error('open-meteo http ' + res.status);
    return normalizeOpenMeteo(await res.json(), new Date().toISOString());
  }

  async function fetchViaWorker(dest) {
    const base = CTA.config.features.weatherWorkerBase;
    const res = await fetchWithTimeout(base.replace(/\/$/, '') + '/api/weather?destId=' + encodeURIComponent(dest.id), 5000);
    if (!res.ok) throw new Error('worker http ' + res.status);
    const data = await res.json();
    data.stale = false;
    return data;
  }

  async function getWeather(dest) {
    const cfg = CTA.config;
    const ttl = cfg.weatherCacheTtlMs.daily;
    const cached = typeof localStorage !== 'undefined' ? readCache(dest.id) : null;
    if (cached && isFresh(cached.savedAt, ttl)) return cached.data;
    try {
      const data = cfg.features.weatherProvider === 'worker-qweather' ? await fetchViaWorker(dest) : await fetchOpenMeteo(dest);
      if (typeof localStorage !== 'undefined') writeCache(dest.id, data);
      return data;
    } catch (e) {
      if (cached) { const d = Object.assign({}, cached.data, { stale: true }); return d; }
      throw new CTA.AppError('WEATHER_UNAVAILABLE', e);
    }
  }

  const api = { getWeather, normalizeOpenMeteo, _cacheKey: cacheKey };
  if (typeof window !== 'undefined') { window.CTA = window.CTA || {}; CTA.weatherService = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
