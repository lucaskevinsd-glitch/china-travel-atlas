# 2.2 首批目的地内容治理清单（2026-11-01）

> **状态：待审核发布候选清单。12 条全部保持 `draft`，未修改任何发布状态。**
> 审查依据：`docs/design-review-package-2026-10.md`（E 节）、`docs/copyright-93-verification-2026-11.md`、
> `data/destinations/batch2-drafts.json`（当前实际数据）、`tools/validate-data.mjs`（42 条 0 错误）。

## 一、图片替换记录（阻塞项已解除）

| 条目 | 替换位置 | 旧图（问题） | 新图 | 作者 | 许可 | 来源链接 |
|---|---|---|---|---|---|---|
| 苏州拙政园 | 图 2（index 1） | 与图 1 字节重复（同源文件 `Humble_Administrator's_Garden_Suzhou_N…`） | 月洞门亭阁、假山与池塘（`suzhou-humble-garden-2.webp` 原位覆盖） | Jakub Hałun | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:20090905_Suzhou_Humble_Administrator%27s_Garden_4550.jpg |
| 西江千户苗寨 | 图 3（index 2） | 与图 1 字节重复（同源文件 `Xi_jiang_Qianhu_Miao_Village1.jpg`） | 苗寨吊脚楼群全景（`xijiang-miao-village-3.webp` 原位覆盖） | Popolon | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Xijiang_Qianhu_Miaozhai.Skyline.jpg |

核验（2026-11-01，目检）：
- 主体对应：苏州新图为拙政园内月洞门亭阁（与保留的图 1 池塘景、图 3  Chainwit. 图不重复，摄影师/年份不同）；西江新图为千户苗寨吊脚楼群全景（与图 1 日景、图 2 夜景视角不同）。
- 清晰度：苏州 3008×2000、西江 3264×1836；已按既有配方生成 1600w full + 640w thumb WebP，四文件均可解码。
- 授权：两图均为 CC BY-SA 4.0，作者/来源链接/许可齐全，已追加登记到 `image-candidates.json`（approved）。
- 去重：替换后两条目内部字节去重 0 重复；与正式集 93 图交叉去重 0 重复。
- **替换后 12 条仍全部为 draft，未转 published。**

## 二、12 条候选核验结果

| # | 条目 | 省份 | 名称/行政区 | 坐标 | 简介/主题/季节 | 图片 | 来源 | 结论 |
|---|---|---|---|---|---|---|---|---|
| 1 | wudadao-tianjin | 天津市 | 五大道文化旅游区 / 和平区 | 39.1095,117.1967 ✓ | 齐全 ✓ | 3 张 ✓ | 维基百科 ✓ | 通过，待正式评审 |
| 2 | chengde-mountain-resort | 河北省 | 承德避暑山庄 | bounds 内 ✓ | 齐全 ✓ | 3 张 ✓ | ✓ | 通过，待正式评审 |
| 3 | hulunbuir-grassland | 内蒙古自治区 | 呼伦贝尔大草原（莫日格勒河） | 49.785,120.1859（河曲观景点，note 明确非景区入口） | 齐全 ✓ | 3 张 ✓ | OSM way 673039820 ✓ | 通过，待正式评审 |
| 4 | shenyang-imperial-palace | 辽宁省 | 沈阳故宫 | bounds 内 ✓ | 齐全 ✓ | 3 张 ✓ | ✓ | 通过，待正式评审 |
| 5 | harbin-central-street | 黑龙江省 | 哈尔滨中央大街 | bounds 内 ✓ | 齐全 ✓ | 3 张 ✓ | Wikidata Q10875064 ✓ | 通过，待正式评审 |
| 6 | suzhou-humble-garden | 江苏省 | 苏州拙政园 | bounds 内 ✓ | 齐全 ✓ | 3 张（图 2 已替换）✓ | ✓ | 通过，待正式评审 |
| 7 | shapotou | 宁夏回族自治区 | 沙坡头 | bounds 内 ✓ | 齐全 ✓ | 3 张 ✓ | ✓ | 通过，待正式评审 |
| 8 | qingdao-badaguan-zhanqiao | 山东省 | 青岛八大关与栈桥 | 36.06,120.3148（栈桥代表点；组合口径已在简介说明） | 齐全 ✓ | 3 张 ✓ | 英文维基 ✓ | 通过，待正式评审（口径确认） |
| 9 | wuzhen | 浙江省 | 乌镇 | bounds 内 ✓ | 齐全 ✓ | 3 张 ✓ | ✓ | 通过，待正式评审 |
| 10 | mount-emei | 四川省 | 峨眉山 | bounds 内 ✓ | 齐全 ✓ | 3 张 ✓ | ✓ | 通过，待正式评审 |
| 11 | xijiang-miao-village | 贵州省 | 西江千户苗寨 | bounds 内 ✓ | 齐全 ✓ | 3 张（图 3 已替换）✓ | ✓ | 通过，待正式评审 |
| 12 | hongcun | 安徽省 | 宏村 | bounds 内 ✓ | 齐全 ✓ | 3 张 ✓ | ✓ | 通过，待正式评审 |

程序核验（2026-11-01）：
- ID/名称与 30 条 published：0 重复。
- 字段完整性：12/12 通过（id/name/province/city/location/type/themes/summary/bestSeasons/suggestedDays/images/source/status）。
- 主题/季节枚举：12/12 合规。
- 图片文件存在且元数据齐全（作者/许可/来源链接）：12/12。
- `validate-data.mjs --check-index`：42 条 0 错误（30 警告为 published 既有 verificationNote 留痕，未新增）。

## 三、尚未满足发布条件的条目

1. **全部 12 条**：`verificationNote` 均为"初步核验，待正式评审"——正式评审（10 条简介二次确认、青岛组合口径确认）完成后方可转 published。本轮未执行正式评审。
2. 无其他阻塞：重复图已替换，坐标/图片/来源无新增问题。

## 四、发布后预期（未执行，仅统计）

42 条；31 省全覆盖（天津/河北/内蒙古/辽宁/黑龙江/江苏/宁夏 0→1；山东/浙江/贵州/安徽 1→2；四川 3→4）。
既有 30 条的 ID 与索引顺序未动。
