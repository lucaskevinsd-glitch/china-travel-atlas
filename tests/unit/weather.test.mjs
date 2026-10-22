import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const weather = require('../../assets/js/services/weather-service.js');

const RAW = {
  current: { time: '2026-10-22T12:00', temperature_2m: 18.5, apparent_temperature: 17.9, relative_humidity_2m: 55, weather_code: 2, wind_speed_10m: 9.4 },
  daily: {
    time: ['2026-10-22', '2026-10-23'],
    weather_code: [2, 61],
    temperature_2m_max: [22, 19],
    temperature_2m_min: [12, 11],
    precipitation_probability_max: [10, 80],
  },
};

test('Open-Meteo 响应归一化为内部模型', () => {
  const m = weather.normalizeOpenMeteo(RAW, '2026-10-22T04:00:00.000Z');
  assert.equal(m.provider, 'open-meteo');
  assert.equal(m.current.temp, 18.5);
  assert.equal(m.daily.length, 2);
  assert.equal(m.daily[1].precipProb, 80);
  assert.equal(m.stale, false);
});

test('坏载荷抛错，由上层转 WEATHER_UNAVAILABLE 占位（不渲染半成品）', () => {
  assert.throws(() => weather.normalizeOpenMeteo(null, 'x'));
  assert.throws(() => weather.normalizeOpenMeteo({}, 'x'));
});
