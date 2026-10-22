# China Travel Atlas 第一阶段开发执行报告（2026-10-22）

范围说明：本轮目标 1–10 中，骨架、路由、视觉变量、Schema、校验/索引工具、3 条样例、基础测试、天气接口在上一轮（用户直接授权建仓后）已完成主体；本轮按总设计师清单逐项复核、补齐缺口（天气契约文档、降级/过期测试、校验器 JSON 报错规范化），并完整重跑全部测试。**本轮未推送、未部署、未启用 Pages。** 远程仓库只有上一轮经用户授权并经审批卡确认的首个提交；本轮 1 个新提交仅在本地。

## A. 修改文件清单

上一轮已推送（提交 `6c825458`，36 文件，远程逐文件 blob SHA 与本地一致，已核验）：骨架全部文件，见 B。

本轮新增/修改（本地提交 `a7121e8`，**未推送**）：
- 新增 `docs/weather-service-contract.md`：天气服务接口契约 v1。
- 新增 `tests/unit/weather-degradation.test.mjs`：3 个降级/缓存测试（夹具数据，非真实天气）。
- 修改 `assets/js/services/weather-service.js`：Node 导出补全为完整 api（原仅导出 normalize，降级测试因此失败，见 G）。
- 修改 `tools/validate-data.mjs`：JSON 解析失败改为规范错误条目（原为未捕获异常堆栈）。
- 修改 `index.html` / `sw.js` / `assets/js/config.js`：资源版本 `20261022a → 20261022b`（因 assets/js 有变更，按统一版本规则三处同步）。
- 新增本报告 `docs/dev-report-2026-10-22.md`。

## B. 目录结构

```
china-travel-atlas/
├─ index.html  manifest.json  sw.js  README.md  .gitignore
├─ assets/css/main.css                视觉变量与移动端布局
├─ assets/js/  config errors store ui data-service router app
│            + pages-home/discover/detail/planner/favorites
├─ assets/js/services/                服务层（任务书 services/ 的落位，职责不变）
│            weather-service.js  planner-service.js
├─ assets/img/  thumb/ full/          当前为空：无授权图片不入库
├─ data/  provinces.json themes.json destinations-index.json meta.json
│       destinations/_examples.json   3 条 draft 样例（下划线文件不进索引）
├─ schemas/destination.schema.json
├─ tools/  validate-data.mjs  build-index.mjs
├─ tests/unit/  planner / data-service / weather / weather-degradation
├─ worker/weather-proxy/              和风代理模板，未部署
└─ docs/  data-standard api-notes testing weather-service-contract dev-report-2026-10-22
```

## C. Schema 字段说明

`schemas/destination.schema.json`（v1）：必填 `id`（小写连字符、唯一、发布后不改名）、`name`、`province`（与 provinces.json 逐字一致）、`city`、`location{lat,lng,coordSystem(GCJ-02|WGS-84)}`、`type`（10 类枚举）、`themes[]`（themes.json 定义）、`summary`（40–120 字）、`highlights`（2–6）、`bestSeasons[]`、`suggestedDays{min,max}`、`activities[]`、`transportNotes`（只写稳定到达方式）、`images[]`、`source{name,url,retrievedAt}`、`verifiedAt`、`status(draft|published|hidden)`；可选 `district`、`adcode`、`seasonNotes`、`verificationNote`。
图片对象必填：`src、thumb、alt、credit、license、sourceUrl`（published 至少 1 张且文件须真实存在；draft 可空数组）。
禁止字段：`ticketPrice/price/openingHours/weather/currentWeather/forecast`——实时天气、票价、开放时间等不得写入静态数据，出现即校验失败。

## D. 校验规则（tools/validate-data.mjs，零依赖）

覆盖任务书 12 项：①JSON 合法性（解析失败记错误条目）②必填缺失 ③类型/枚举/长度/数值范围 ④ID 全局重复 ⑤坐标粗界 lat[3,54]、lng[73,136] ⑥坐标系必填且二选一 ⑦主题/季节/类型来自定义表 ⑧图片与缩略图文件存在 ⑨图片授权字段完整 ⑩来源 https 链接与 retrievedAt/verifiedAt 日期合法（verifiedAt 超 12 个月警告）⑪published 须有可追溯来源（同 ⑩对全部记录执行，published 另加图片≥1 与 verificationNote 警告）⑫`--check-index` 时 index 条数与 published 数、ID 对应关系一致。任一 ERROR 退出码 1，WARNING 不阻断。

## E. 实际执行的测试命令

```bash
for f in $(find assets sw.js -name "*.js"); do node --check "$f"; done
node tools/validate-data.mjs                      # 正例
node tools/build-index.mjs
node tools/validate-data.mjs --check-index
node <临时目录>/tools/validate-data.mjs            # 反例（临时目录构造，不污染仓库）
node --test tests/unit/*.test.mjs
node -e "<真实请求 api.open-meteo.com 并 normalizeOpenMeteo>"   # 真实联调复核
git status / rev-parse（本项目与 4 个其他项目 HEAD 对照）
```

## F. 测试输出和退出码

| 测试 | 结果 | 退出码 |
|---|---|---|
| JS 语法检查（15 文件） | ok=15, fail=0 | 0 |
| 校验正例（3 条 draft） | 0 错误 0 警告，published 0 | 0 |
| build-index + --check-index | 生成 index 0 条；一致性通过 | 0 |
| 校验反例（临时目录） | 11 个错误全部命中：JSON 不合法、非法 ID、ID 重复、坐标越界、未定义主题、禁止字段 ticketPrice、图片 credit/license/sourceUrl 缺失、图片/缩略图文件不存在 | 1（预期） |
| 单元测试（4 文件 13 用例） | pass 13, fail 0 | 0 |
| Open-Meteo 真实请求（张家界坐标） | 返回实况温度 13°C、7 天预报，归一化成功，updatedAt=2026-10-22T12:45 | 0 |
| 真实浏览器测试 | **未执行**：托管浏览器拦截 localhost；Pages 未启用（本轮无部署授权）。不得以静态检查替代，待部署授权后补做 | — |

## G. 失败用例及修复结果

1. 天气降级测试首跑 3/3 失败：`weather.getWeather is not a function`——weather-service 的 Node 导出只暴露了 `normalizeOpenMeteo`。已修复为导出完整 api，复跑 13/13 通过。属实现缺陷，非测试问题。
2. （上一轮记录）规划测试同分目的地排序断言失败：名称中文排序与预期不符，改测试夹具名称后通过，规划逻辑未改。
3. （上一轮记录）`node --test tests/unit/` 目录形式在 Node 24 报 MODULE_NOT_FOUND，须用 `tests/unit/*.test.mjs` 通配，已写入 docs/testing.md 口径。

## H. 当前 Git 状态

- 本项目：分支 `main`，本地 HEAD `a7121e8`（含本报告提交后以仓库实际为准），工作区干净；远程 `origin/main` 仍为 `6c825458`——**本轮提交未推送**，与本轮“不得推送/部署”要求一致。
- 仓库：`lucaskevinsd-glitch/china-travel-atlas`，Public（上一轮按用户指令创建，API 建仓 403 后走网页端建空仓）。
- 其他项目：FoodAtlas `53ced40`、青简 `42fd4d1`、LobeChat `fcbc16a6`、dsh-free-model `e937077`，HEAD 与本轮开始前一致，本轮未写入这些目录（其工作区既存未提交修改非本轮产生）。

## I. 尚未完成

- 真实浏览器冒烟（首页/发现/详情/规划/收藏逐页）与手机真机验收：待部署授权与 Pages 启用后执行。
- GitHub Pages 未启用；本轮新提交未推送。
- published 目的地仍为 0：3 条样例坐标为近似值、图片无授权，保持 draft；首批清单与图片来源待总设计师/用户拍板。
- 和风天气未接入（无密钥、未注册）；Worker 为未部署模板，上游路径与鉴权头部署前须按届时官方文档复核。
- 天气缓存时长与和风许可细则、高德配额、彩云现行价格：仍待验证（见评估报告）。
- 完整首页（精选内容、真实图片）未做，属下一阶段且依赖首批数据定稿。

## J. 下一阶段建议

1. 总设计师确认首批 30–50 个目的地清单与图片授权路线后，逐条核验录入（坐标、来源、图片授权三件齐全才转 published）。
2. 用户决定天气路线：注册和风并以 Secret 注入 Worker 后，单独一轮做和风真实联调（含 3 地点坐标口径实测）。
3. 获部署授权后：推送本地提交、启用 Pages、执行线上真实浏览器冒烟 + assetV 一致性抽查，再报验收结果。
4. 首页完整版与发现页体验优化在首批数据定稿后进行，避免为假数据做设计。
