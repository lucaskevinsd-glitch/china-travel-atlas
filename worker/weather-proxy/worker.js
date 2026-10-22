/* China Travel Atlas — 天气代理 Worker（模板，未部署）
 * 作用：密钥只存 Cloudflare Worker Secret（QWEATHER_API_HOST / QWEATHER_API_KEY），前端永不直连和风。
 * 接口：GET /api/weather?destId=<id> —— destId 必须在内置白名单（坐标自备，不调用和风 GeoAPI 建库）。
 * 缓存：边缘缓存 30 分钟；上游失败时返回最近缓存并标记 stale。
 * 部署前待办：1) 在目的地数据定稿后生成 DESTINATIONS 白名单；2) 核对和风许可协议的缓存时长细则；
 *              3) 在控制台设置预算告警；4) 绑定自有域名并把前端 config.features.weatherWorkerBase 指向它；
 *              5) 下方上游路径与鉴权头按和风届时官方文档逐项复核后再部署（本模板未实测，不得直接上线）。
 */
const DESTINATIONS = {
  // 示例（草案坐标，未核验前不得上线）：
  // 'zhangjiajie-national-forest-park': { lat: 29.3153, lng: 110.4341 },
};
const CACHE_TTL_SECONDS = 1800;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/weather') return json({ error: 'not_found' }, 404);
    const destId = url.searchParams.get('destId') || '';
    const dest = DESTINATIONS[destId];
    if (!dest) return json({ error: 'unknown_destination' }, 400);
    if (!env.QWEATHER_API_HOST || !env.QWEATHER_API_KEY) return json({ error: 'proxy_not_configured' }, 503);

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const loc = dest.lng.toFixed(2) + ',' + dest.lat.toFixed(2);
    try {
      const [nowRes, dailyRes] = await Promise.all([
        fetch(`https://${env.QWEATHER_API_HOST}/v7/weather/now?location=${loc}`, { headers: { 'X-QW-Api-Key': env.QWEATHER_API_KEY } }),
        fetch(`https://${env.QWEATHER_API_HOST}/v7/weather/7d?location=${loc}`, { headers: { 'X-QW-Api-Key': env.QWEATHER_API_KEY } }),
      ]);
      if (!nowRes.ok || !dailyRes.ok) throw new Error('upstream ' + nowRes.status + '/' + dailyRes.status);
      const now = await nowRes.json();
      const daily = await dailyRes.json();
      const body = {
        provider: 'qweather',
        attribution: '天气数据来源：和风天气 QWeather',
        updatedAt: now.updateTime || new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        current: {
          temp: Number(now.now.temp), feelsLike: Number(now.now.feelsLike),
          weatherText: now.now.text, humidity: Number(now.now.humidity), windSpeed: Number(now.now.windSpeed),
        },
        daily: (daily.daily || []).map(d => ({
          date: d.fxDate, tempMax: Number(d.tempMax), tempMin: Number(d.tempMin),
          weatherTextDay: d.textDay, precip: d.precip,
        })),
        stale: false,
      };
      const res = json(body, 200, { 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (e) {
      return json({ error: 'weather_unavailable' }, 502);
    }
  },
};
function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': 'https://lucaskevinsd-glitch.github.io' }, extraHeaders || {}),
  });
}
