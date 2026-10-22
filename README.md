# China Travel Atlas · 中国旅行图鉴

面向中国大陆目的地的旅行规划网站：发现目的地、按风景/季节/主题筛选、查看详情与天气、生成规则行程草案、本地收藏。

## 当前状态（第一阶段 · 骨架）

- 零构建静态站：原生 HTML/CSS/JS + Hash 路由 + PWA，部署目标 GitHub Pages。
- 页面：首页、发现（搜索+多维筛选）、目的地详情（含天气区）、旅行规划（规则版）、收藏（localStorage）。
- 数据：目的地数据标准 v1 已落地（见 `docs/data-standard.md` 与 `schemas/destination.schema.json`）；当前只有 3 条 **draft 草案**（`data/destinations/_examples.json`，坐标为近似值、图片未取得授权），**已发布（published）为 0 条**，页面会如实显示空状态，不用假数据填充。
- 天气：一期联调用 Open-Meteo（无密钥、仅限非商业原型，数据 CC BY 4.0，页面带来源标注）；生产主选和风天气必须经 `worker/weather-proxy/` 代理，密钥永不进前端。
- AI 规划：二期功能，一期未启用、不预埋密钥。

## 本地运行与校验

```bash
python3 -m http.server 8000        # 浏览器打开 http://localhost:8000
node tools/validate-data.mjs       # 目的地数据校验（错误退出码 1）
node tools/build-index.mjs         # 由详情分片生成 index 与 meta（先校验再生成）
node tools/validate-data.mjs --check-index
node --test tests/unit/*.test.mjs  # 单元测试
```

## 发布规则

- 改任何 CSS/JS/数据，必须同步递增三处版本：`index.html` 的 `?v=`、`assets/js/config.js` 的 `assetV`、`sw.js` 的 `VERSION/AV`。
- 发布前跑通校验与单测，并用真实浏览器验收实际渲染；静态检查不得冒充真机验收。
- 目的地转 `published` 的前提：来源可追溯、坐标逐项核验、图片有明确授权。无授权图片、AI 生成图不得充作实景图。
- 票价、开放时间、实时天气禁止写进静态数据。
