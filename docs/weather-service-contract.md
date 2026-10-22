# 天气服务接口契约 v1

实现：`assets/js/services/weather-service.js`。页面层只能调用本契约，不得直接请求任何天气供应商，更不得接触带密钥的接口。

## 对外接口

`CTA.weatherService.getWeather(destination) -> Promise<WeatherModel>`

- 入参 `destination`：目的地完整记录，至少含 `id` 与 `location {lat, lng, coordSystem}`。
- 成功（含降级成功）返回统一模型；彻底失败时抛 `CTA.AppError`，`code = 'WEATHER_UNAVAILABLE'`，页面据此渲染占位，不渲染半成品。

## 统一数据结构 WeatherModel

| 字段 | 说明 |
|---|---|
| `provider` | 数据来源标识，如 `open-meteo` / `qweather`；页面必须据此显示来源标注 |
| `updatedAt` | 上游数据时间（ISO 字符串），页面必须显示 |
| `fetchedAt` | 本次获取时间 |
| `current` | `{ temp, feelsLike, weatherCode, humidity, windSpeed }`（weatherCode 为供应商代码，页面负责本地化文案） |
| `daily[]` | `{ date, tempMax, tempMin, weatherCode, precipProb }`，按日期升序 |
| `stale` | boolean；用过期缓存兜底时为 `true`，页面必须显示“数据可能已过期” |

供应商特有字段不得越过本服务进入页面；新增供应商只需在本服务内加一个 `normalize<Provider>` 与一个 `fetch<Provider>`。

## 缓存与错误策略

- 缓存：localStorage，键 `cta.weather.v1.<destId>`；TTL 见 `config.weatherCacheTtlMs`（实况 30 分钟 / 逐日 3 小时口径）。新鲜缓存直接返回，不发请求。
- 超时：单次请求 5 秒（AbortController）；不自动重试连环请求。
- 降级顺序：新鲜缓存 → 实时请求 → 过期缓存（`stale: true`）→ 抛 `WEATHER_UNAVAILABLE`。
- 失败不写缓存，不吞异常信息到用户界面（原始异常只进 `AppError.cause`）。

## 第一版降级策略（2026-10-22 总设计师决策）

- 天气不阻塞第一版核心产品：天气仅出现在详情页，页面主体先完整渲染，天气异步加载；天气失败、超时或被关闭都不得影响详情、搜索、筛选、收藏与规划。
- 展示型降级（不隐藏、不伪造）：请求失败显示"天气暂不可用，请稍后再试"；用过期缓存时显示过期警示；成功时必须显示数据来源与更新时间。任何状态下不生成、不缓存虚构天气。
- 总开关：`CTA.config.features.weatherEnabled`。置 false 时详情页天气区直接显示不可用（tests/e2e/weather-off.mjs 覆盖此路径）。生产链路（和风）未验证前，若站点性质或合规要求不允许使用 Open-Meteo，上线前将此开关置 false 即可完成降级，无需改代码。
- 生产状态标识：截至本节写入时，生产服务**未完成真实验证**（和风未接入、Worker 未部署）；Open-Meteo 为开发联调通道，不得在对外材料中宣称为生产天气服务。

## 供应商状态

- Open-Meteo：已接入（无密钥），仅非商业原型/联调，数据 CC BY 4.0，页面标注来源。
- 和风 QWeather：未接入。生产接入必须经 `worker/weather-proxy/` 代理，密钥只存 Worker Secret；接入前需复核其许可中的缓存时长细则与来源标注要求，并以 3 个已知地点实测坐标口径。
- 测试数据：单元测试中的固定载荷均为**测试夹具**（在测试文件中构造），不得描述为真实天气；真实联调记录单独标注日期与坐标（见 docs/testing.md）。
