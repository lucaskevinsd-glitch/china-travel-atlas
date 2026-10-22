# 图片授权方案 v1（2026-10-22 实查）

结论：第一阶段只用 **Wikimedia Commons** 作为图片来源。理由：全站只收自由许可内容，每张文件的许可、作者、原图页面都可通过官方 API 机器读取并逐张复核；其他来源要么明确声明不核验许可（Openverse），要么为平台统一许可且中国目的地覆盖与逐图溯源较弱（Pexels），列为后续备选，不在一期混用。

## 来源评估

| 来源 | 许可模式 | 修改/裁剪/压缩 | 署名 | 其他义务 | 逐图溯源 | 定级 |
|---|---|---|---|---|---|---|
| Wikimedia Commons | 逐图许可：CC0、Public domain、CC BY、CC BY-SA（各版本）为主；含 NC/ND 的文件 Commons 本身不收 | CC BY / BY-SA / CC0 / PD 均允许改编（含裁剪、缩放、转码） | CC BY、CC BY-SA 必须署名作者、附许可链接、注明是否修改；CC0/PD 法律上不强制，本项目仍统一记录 | BY-SA：改编版本须以相同许可分发（本站图片文件本身按同许可提供，页面注明）；不得暗示作者背书 | 有：文件页 URL 稳定，API（imageinfo/extmetadata）返回 LicenseShortName、LicenseUrl、Artist、Credit | **一期唯一来源** |
| Openverse | 聚合各站 CC 许可，API 可按 license 过滤 | 取决于逐图许可 | 取决于逐图许可 | 官方明确声明：不核验单个作品的许可与署名准确性，必须回源头独立核实 | 有源头链接，但许可以上游声明为准 | 仅作发现工具，结论必须回 Commons/源站复核后才算数 |
| Pexels | 平台统一 Pexels License（部分 CC0） | 允许修改 | 不要求（鼓励） | 禁止：未修改原图单独转售/再分发至图库平台、暗示图中人物或品牌背书、商标与人物肖像需自行确认权利 | 逐图作者与页面存在，但许可是平台条款而非逐图声明 | 备选：若一期后需要补充生活类图片，逐图按其条款核对后再启用，并同样登记六字段 |

明确排除：搜索引擎结果图、旅游/新闻网站配图、社交平台图片、AI 生成图冒充实拍——均不进入候选池。

## 与现有 Schema 的映射（不变更 schema）

现有图片对象六字段足够承载 Commons 授权信息，无需改 schema：

- `license`：填许可短名全称，如 `CC BY-SA 4.0`、`CC BY 2.0`、`CC0 1.0`、`Public domain`。
- `credit`：填 `作者名 / Wikimedia Commons`，本站做过裁剪/转码时追加 `（本站已裁剪/压缩，原图见来源页）`，满足 CC 的“注明修改”要求。
- `sourceUrl`：填 Commons 文件页，如 `https://commons.wikimedia.org/wiki/File:xxx.jpg`（可回溯许可与原图）。
- `alt`：描述图片内容（无障碍用途），不写作者信息。
- `src` / `thumb`：本地化后的文件路径（见下）。

展示义务落地：详情页在图片下方渲染 `credit` 并链接 `sourceUrl` 与许可链接（许可 URL 由登记表保存，页面从数据生成）；BY-SA 图片的改编文件在仓库内随附许可说明（本文件即为项目级说明，单图许可以数据字段为准）。

## 图片审核流程（每张必走，可重复执行）

1. **检索**：Commons API（`generator=search` + `imageinfo/extmetadata`）或 Openverse 发现后回 Commons 定位文件页。
2. **许可门槛**：许可必须属于 CC0 / Public domain / CC BY / CC BY-SA；出现 NC、ND 或许可字段缺失、作者不明的，直接判不合格。
3. **内容核对**：人工打开文件页与原图，确认拍的确实是该目的地现状（排除卫星图、历史老照片冒充现状、明显误标）。
4. **登记**：写入 `data/candidates/image-candidates.json`，状态置 `license-ok-pending-visual`（许可过）→ 目检过置 `approved`；不合格置 `rejected` 并写原因。
5. **本地化**（approved 后另行执行，本轮未做）：从 Commons 取缩放版本——全图宽 ≤1600、缩略图宽 640，转 WebP；原图动辄 2300–7600 px、多 MB 级，禁止原图直入仓库。估算 30 个目的地 ×（全图约 350 KB + 缩略约 80 KB）≈ 13 MB，可接受；逐批下载后实测复核。
6. **入库校验**：图片写入目的地数据后跑 `tools/validate-data.mjs`，其图片存在性与授权字段检查必须通过，目的地才可转 `published`。

## 本轮实查结果（2026-10-22，Commons API）

对张家界、西湖、丽江各取 6 张候选，共 18 张，许可元数据全部可读：
- **通过许可门槛、待人工目检 14 张**：CC BY 2.0 ×5（张家界）、CC BY-SA 3.0/4.0 ×9（西湖 3、丽江 6）。明细见 `data/candidates/image-candidates.json`。
- **已排除 4 张**：卫星遥感 TIFF 1 张（非游客视角照片）、Public domain 历史照片 3 张（1930 年代西湖，许可没问题但不是现状，内容不合格）。
- **已确认可直接入库 0 张**：目检与本地化尚未执行，本轮不下载任何图片。
