import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/* 本文件的载荷与缓存均为测试夹具，不是真实天气数据。 */
class FakeAppError extends Error { constructor(code, cause) { super(code); this.code = code; this.cause = cause || null; } }
const storage = new Map();
global.localStorage = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k),
};
global.CTA = {
  AppError: FakeAppError,
  config: {
    weatherCacheTtlMs: { current: 1800000, hourly: 3600000, daily: 10800000 },
    features: { weatherProvider: 'open-meteo', weatherWorkerBase: '' },
  },
};
global.window = { CTA: global.CTA };
const weather = require('../../assets/js/services/weather-service.js');
global.CTA.weatherService = weather;

const DEST = { id: 'test-dest', location: { lat: 29.32, lng: 110.43, coordSystem: 'WGS-84' } };
const CACHED_MODEL = {
  provider: 'open-meteo', updatedAt: '2026-10-22T00:00:00.000Z', fetchedAt: '2026-10-22T00:00:00.000Z',
  current: { temp: 10, feelsLike: 9, weatherCode: 3, humidity: 60, windSpeed: 5 },
  daily: [], stale: false,
};

test('请求失败且有过期缓存：返回缓存并标记 stale=true', async () => {
  storage.clear();
  global.localStorage.setItem(weather._cacheKey(DEST.id), JSON.stringify({ savedAt: Date.now() - 10 * 86400000, data: CACHED_MODEL }));
  global.fetch = async () => { throw new Error('network down (test stub)'); };
  const m = await weather.getWeather(DEST);
  assert.equal(m.stale, true);
  assert.equal(m.current.temp, 10);
});

test('请求失败且无缓存：抛 AppError WEATHER_UNAVAILABLE', async () => {
  storage.clear();
  global.fetch = async () => { throw new Error('network down (test stub)'); };
  await assert.rejects(() => weather.getWeather(DEST), e => e.code === 'WEATHER_UNAVAILABLE');
});

test('请求成功：归一化结果被返回且写入缓存，新鲜缓存期内不重复请求', async () => {
  storage.clear();
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({
        current: { time: '2026-10-22T12:00', temperature_2m: 15, apparent_temperature: 14, relative_humidity_2m: 50, weather_code: 1, wind_speed_10m: 6 },
        daily: { time: ['2026-10-22'], weather_code: [1], temperature_2m_max: [20], temperature_2m_min: [9], precipitation_probability_max: [5] },
      }),
    };
  };
  const m1 = await weather.getWeather(DEST);
  assert.equal(m1.current.temp, 15);
  const m2 = await weather.getWeather(DEST);
  assert.equal(m2.current.temp, 15);
  assert.equal(calls, 1, '第二次应命中新鲜缓存');
});
