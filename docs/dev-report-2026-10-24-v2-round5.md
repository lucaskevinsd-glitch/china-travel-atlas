# China Travel Atlas 2.0 第五轮报告（2026-10-24）

起始 HEAD ab42657（第四轮终点），结束 HEAD 见提交节。本轮仅本地开发、审查、测试与本地提交，未推送、未部署、未公开候选目的地、未将任何 draft 改为 published。线上仍为 1.0（20261022e）。

## 基线核对

分支 main，HEAD ab42657 与报告一致，工作区开始时干净；12 条 draft 各 1 图、状态 draft；`sw.js` 已含 `planner-edit.js` 预缓存；图片工具位于 `~/workspace/cta_tools/`（find/preview/process_images），本轮新增 `draft_process.py`（draft 专用挂接变体，逻辑与正式集流程一致）。

## P0：12 条候选补图（24 张新增，全部达标）

每条候选由 1 图补至 3 图，共新增 24 张；全部经 Commons 检索 → 640px 预览逐张审看 → 1600w/640w WebP 处理 → 登记 → 挂接 → 校验。拒绝 21 张（含 6 张“已有更优两张故未选用”的备选）。逐条结果（首图为第三轮已批准）：

| 候选 | 新增图 2（内容 / 来源 / 许可） | 新增图 3（内容 / 来源 / 许可） | 拒绝要点 |
|---|---|---|---|
| 五大道 | 浅色洋楼 / xiquinhosilva / CC BY 2.0 | 街景马车雕塑 / xiquinhosilva / CC BY 2.0 | 红砖街角：与首图同题材，未用 |
| 承德避暑山庄 | 湖区木桥游船 / xiquinhosilva / CC BY 2.0 | 湖面全景与远山 / xiquinhosilva / CC BY 2.0 | 同木桥另一角度：近重复 |
| 呼伦贝尔草原 | 河畔马群 / Sergio Tittarini / CC BY 2.0 | 草原骆驼与湖泊 / Sergio Tittarini / CC BY 2.0 | 草原蓝天广角：与首图同题材 |
| 沈阳故宫 | 航拍全景 / Techyan / CC BY-SA 4.0 | 大政殿外观 / xiquinhosilva / CC BY 2.0 | 大缸特写：曝光过曝、识别度弱 |
| 哈尔滨中央大街 | 夜景面包石路 / Jonashtand / CC BY-SA 4.0 | 白天街景与历史建筑 / Jonashtand / CC BY-SA 4.0 | 路牌特写、巡逻车主体、活动摊位、现代商场立面 |
| 苏州拙政园 | 池塘秋色 / King of Hearts / CC BY-SA 4.0 | 临水亭阁 / Chainwit. / CC BY 4.0 | 同水面另一角度：近重复 |
| 沙坡头 | 沙漠边缘植被与远处沙丘 / Matthew Summerton / CC BY-SA 3.0 | 蒙古大营入口门楼 / Matthew Summerton / CC BY-SA 3.0 | 公路/商铺/农田/标牌等无主体照 5 张 |
| 青岛八大关与栈桥 | 白墙红顶别墅 / Windmemories / CC BY-SA 4.0 | 石砌别墅 / Windmemories / CC BY-SA 4.0 | 第三栋别墅：已有更优两张，未用 |
| 乌镇 | 河道与乌篷船 / Jakub Hałun / CC BY-SA 4.0 | 石桥与双船 / Jakub Hałun / CC BY-SA 4.0 | 乌篷船近景：同题材，未用 |
| 峨眉山 | 金顶普贤金像 / Martin Wettig / CC BY-SA 3.0 | 金顶云雾中的白象 / Truthven / CC BY-SA 3.0 | 夜色剪影：标题称金顶但无法核实 |
| 西江千户苗寨 | 夜景灯光 / Hhhh2 / CC BY-SA 4.0 | 日间全景 / Hhhh2 / CC BY-SA 4.0 | 黄昏全景：同夜景题材，未用 |
| 宏村 | 南湖倒影与石桥 / 颐园新居 / CC BY-SA 4.0 | 月沼倒影与民居 / Luo Shaoyang / CC BY 2.0 | 南湖晴天照：与南湖图同题材，未用 |

一致性：12 条 draft 共 36 图，文件全部存在；登记表 approved 129 张 = 正式集 93 + draft 36；无孤儿图片；校验 0 错误；索引仍只输出 30 条 published，draft 未进入。

## P0：三项事实修正（均只改 draft 数据，状态不变）

1. **沙坡头坐标（已更正）**：原 37.5169,105.1738 实为沙坡头区行政点位。新坐标 **37.4659,104.9954**，三来源交叉：OpenStreetMap Nominatim“沙坡头旅游区”点位 37.4659276,104.9954087；中科院沙坡头沙漠试验研究站代表坐标（DEIMS）37.4601,105.0001；景区站区坐标 104°57′E, 37°27′N。三者互差约 5 公里内，均指向中卫市区以西约 16 公里景区一带。verificationNote 已记录更正过程与来源。
2. **乌镇简介（已修正）**：删除“著名”一词，改为“江南水乡古镇，位于浙江省桐乡市，河道与民居沿水展开，东西栅片区各具风貌，适合水乡漫步与夜景游览。”（48 字，符合 40–120 字校验；删除后初版 39 字曾触发校验错误，已补“位于浙江省桐乡市”修复，校验回 0 错误）。
3. **呼伦贝尔坐标（未更正，保留待核验）**：本轮二次核验时 Nominatim 未返回该河名及观景台条目，坐标未能以第二来源复现；河道走向资料（中文维基：陈巴尔虎旗境内、东北向西南流经草原）仅能佐证点位落在河流上游走廊，无法确认为精确观景点。按“无法确认不得猜测替换”原则，坐标保持 49.785,120.1859 不变，verificationNote 已明确标记为初步核实、发布前须以地图实测或官方景区点位复核，并澄清标记为河曲代表观景点而非景区入口。

## P1：Service Worker 离线专项验收（已执行，Firefox 真实断网）

新增可复现测试 `tests/e2e/sw-offline.mjs`，用 `context.setOffline(true)` 做浏览器级断网（非模拟页面状态），结果 12/12：

- 首次安装：在线打开后 SW 就绪，缓存键 `cta-v1-20261024d`，预缓存含 `planner-edit.js`（路径与 `?v=` 版本一致）、核心脚本与索引数据。
- 离线重开：首页渲染（6 张卡片）、详情页标题渲染、规划页草案恢复。
- 离线行程编辑：上移按钮工作、顺序交换、离线刷新后编辑结果仍在（localStorage 草案）。
- 离线图片：本次 Firefox 实测中详情图片离线仍显示（naturalWidth 244，与在线一致），系浏览器 HTTP 缓存命中；**但 SW 设计本身不预缓存图片，离线图片可用性不由 SW 保证**，此点如实记录，不夸大为 SW 能力。
- 版本升级：恢复联网后将夹具版本改为 20261024e 并重载，新缓存 `cta-v1-20261024e` 生效、旧缓存已清理、新缓存含新版 `planner-edit.js`，无旧版脚本混用。
- 预缓存规模：CORE + DATA 仅含脚本、样式与 4 个 JSON，新增的 24 张 draft 图片与 93 张正式图均不在预缓存内，符合“不预缓存全部图片”的约束。
- 限制：离线测试仅在 Firefox 执行（Chromium 在本沙箱无法直连回环地址，见既往记录）；K80 真机离线行为仍未验证。

## P2：回归测试（实际执行命令与结果）

- `node tools/validate-data.mjs --check-index`：0 错误（42 条；30 警告为既有 published verificationNote 留痕）。
- `node tools/build-index.mjs`：30 条 published（draft 未进入）。
- `node --test tests/unit/*.test.mjs`：35/35。
- `tests/e2e/smoke-http.mjs`（Firefox）：16/16；`smoke.mjs`（Chromium 拦截）：16/16。
- `discover-state.mjs`：8/8 ×2；`gallery.mjs`：9/9 ×2；`related.mjs`：6/6 ×2；`weather-off.mjs`：6/6。
- `planner-edit.mjs`：11/11 ×2（含 390px 视口 scrollWidth=390，无横向溢出；保存失败路径由单测覆盖：写入失败返回 false 但内存草案保留）。
- `sw-offline.mjs`：12/12（Firefox，见 P1）。
- 无测试断言被放宽；sw-offline 测试在 C 阶段改写的是 /tmp 夹具版本号，仓库版本未动，回归前已重建全部夹具。

## P3：发布候选审计

- 差异：`git diff 7f38c00..HEAD` 共 193 个新增文件、18 个修改文件、**0 个删除**；`first-batch.json` 事实字段未动（本轮仅 draft 文件与图片新增）。
- 敏感信息：assets/js、index.html、sw.js 中无密钥类字串，无 `console.log`/`debugger`，无 .env 或临时残留。
- 天气：`weatherEnabled: false`，未引入密钥或外部服务。
- 版本与缓存：三处版本一致为 20261024d；本轮未改动任何已发布运行时文件（索引输出未变、SW CORE 未变），故无需递增版本；draft 图片不在 SW 预缓存内，不影响已发布用户缓存。
- 行程编辑与离线缓存兼容性：`planner-edit.js` 在 SW CORE 内且离线实测可用；编辑数据走 localStorage，不依赖网络。
- GitHub Pages 路径：相对路径资源未变，无新增绝对路径。

## 状态区分与发布候选结论

- 已实现：12 条 draft 各 3 图；沙坡头坐标更正；乌镇措辞修正；SW 离线专项测试与通过。
- 已验证：上述全部测试与审计结果。
- 未验证：K80 真机验收（含真机离线行为）；SW 在 Chromium 下的离线行为（沙箱限制）。
- 未完成：呼伦贝尔坐标第二来源复核（仍为初步核实）。
- **发布候选结论：仍未达到。** 剩余阻塞项：① 呼伦贝尔坐标需第二来源复核（唯一事实阻塞）；② K80 真机验收未执行；③ draft 转 published 本身仍需总设计师另行明确授权（本轮未做）。其余条件（图片门槛、索引隔离、天气关闭、版本缓存、回归测试）均已满足。

## 提交

- 内容提交：`dcf7d50`（12 条 draft 补图 + 三项事实修正）。
- 本报告与离线测试提交：`a2ca700`。
- 历史未重写；工作区提交后干净。

**声明：本轮未推送、未部署、未公开候选目的地、未将任何 draft 改为 published。**
