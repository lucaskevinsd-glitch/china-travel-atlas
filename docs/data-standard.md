# 目的地数据标准 v1（摘要）

机器可读规范：`schemas/destination.schema.json`；校验实现：`tools/validate-data.mjs`（零依赖）。

## 核心规则

- `id`：小写字母/数字/连字符，全局唯一，一经发布不得改名。
- `province` 必须与 `data/provinces.json` 的名称逐字一致；`themes/bestSeasons/type` 取值只能来自 `data/themes.json` 与 schema 枚举。
- `location.coordSystem` 必填（`GCJ-02` 或 `WGS-84`），坐标须落在中国大陆粗界（lat 3–54、lng 73–136），越界即校验报错并人工复核。
- `summary` 40–120 字，只写可核实特征；`transportNotes` 只写稳定的到达方式。
- `images`：draft 可为空；published 至少 1 张，每项须有 `src/thumb/alt/credit/license/sourceUrl` 且文件真实存在。无明确授权的图片不入库；AI 生成图禁止充作实景图，示意图须 `isIllustration: true` 且页面明示。
- `source`（名称 + https 链接 + 检索日期）与 `verifiedAt` 必填；超过 12 个月未核验会产生警告。
- **禁止字段**：`ticketPrice/price/openingHours/weather/currentWeather/forecast` 出现在记录中即校验失败——票价、开放时间、实时天气不得写进静态数据。
- 草案文件以 `_` 开头（如 `_examples.json`），参与校验但不进索引；只有 `status: "published"` 且位于省份分片文件中的记录才会被 `tools/build-index.mjs` 收进 `destinations-index.json`。

## 状态流转

`draft`（草案，含待核验项，`verificationNote` 必填说明）→ 逐项核验（来源打开可达、坐标与地图位置一致、图片授权落实）→ `published`；下线用 `hidden`，不删历史记录。
