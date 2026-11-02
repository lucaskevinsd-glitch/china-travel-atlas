# China Travel Atlas 2.2 发布前验收报告（2026-11-01）

> 审计人：Muse（执行），ChatGPT（最终审核）。
> **第二轮修订**：用户 2026-11-01 23:10 授权修复最终阻塞项（SW 预缓存遗漏、gallery 测试口径、
> 360px 轮播控件），本轮实际执行了代码/测试修改与全量回归。
> **约束遵守声明**：本轮未推送 GitHub、未部署；未修改任何 draft/published 状态（12 条候选仍全部 draft）；
> 未新增产品功能、未做大规模视觉重构；所有改动仅存于本地工作区，**未创建提交、未推送**。
> 以下所有"通过/失败"均为本轮实际执行结果；凡未执行项均明确标记，未用静态分析冒充。

## 一、测试总览（本轮全部实际执行，非复制旧结果）

| # | 命令 | 退出码 | 结果 |
|---|---|---|---|
| 1 | `node tests/e2e/cta22-accept.mjs`（真实 Firefox） | 0 | **42/42**（含新增 3 项标签栏回归断言） |
| 2 | `node --test tests/unit/*.test.mjs` | 0 | 39/39 |
| 3 | `node tests/e2e/lightbox-focus.mjs` | 0 | 16/16 |
| 4 | `node tests/e2e/gallery.mjs`（确定性 fixture，§三） | 0 | **9/9**（连续 3 次可重复） |
| 5 | `node tools/validate-data.mjs --check-index` | 0 | 42 条（published 30），0 错误，30 警告（既有 verificationNote 留痕） |
| 6 | SW 更新+离线验证 `sw-fix-verify.mjs`（真实 Firefox，§二） | 0* | 21/21 实质通过（*1 项为脚本字符串断言笔误，另行实证通过，见 §二） |

## 二、任务 A：Service Worker 预缓存遗漏 —— 已修复并验证

### 修复内容
- `sw.js`：CORE 清单加入 `'./assets/js/pages-credits.js?v=' + AV,`（1 行，与现有条目同规范）。
- 版本约定：按 `sw.js` 头部注释"改任何静态资源必须同步递增 VERSION 与 AV"，将
  `20261101a` → **`20261101b`**，四处一致：`sw.js`（VERSION/AV）、`index.html`（17 处 `?v=`）、
  `assets/js/config.js`（assetV）。（`20261101a` 从未部署，无存量客户端需要兼容。）
- 未重构 SW：安装/激活/清理/请求逻辑零改动。

### 验证方法（真实 Firefox，本地同源模拟，非真实线上更新流程）
旧版目录（`4667217`，`cta-v1-20261028a`）与新版目录（当前工作区，`cta-v1-20261101b`）
先后 serving 于同一源 `http://127.0.0.1:8140`，全新浏览器 profile；阶段间用 `reload`
（非同 URL `goto`）触发 SW 更新检查。

### 验证结果
- PASS：旧 SW 安装并接管；新 SW 发现→安装→激活；旧缓存按 `activate` 逻辑清理
 （`caches.keys()` 仅剩 `cta-v1-20261101b`）。
- PASS：Cache Storage 程序列出 **22 条目**（21+1），含
  `./assets/js/pages-credits.js?v=20261101b`。
- PASS：缓存响应实际可读——状态 200、3024 字节、含 `CTA.pages.credits` 真实代码
  （注：脚本中 1 项"缓存响应可读"子断言因断言字符串误写英文 `credits` 而头注释为中文，
  判 FAIL；已用独立实证确认 200/3024 字节/含真实函数，**实质通过**）。
- PASS：在线加载首页 / 发现页 / 详情页 / 规划页 / 版权页全部正常，零控制台错误。
- PASS：深链 `#/credits?dest=huangshan&img=1` 定位到 `#ci-huangshan-1`、`.flash` 高亮、
  行内含 wikimedia 来源链接。
- PASS：断网后**首次打开即直接进入 `#/credits`** 正常渲染（含 `.credit-img` 93 行）；
  离线五页全部可渲染，离线阶段无新增控制台错误。
- PASS：更新后实际请求去重 21 个，**0 个旧版本（`?v=20261028a`/`?v=20261101a`）请求**，
  无新旧资源混用。
- 修复前行为（上一轮实证）：预缓存 21 条目无 `pages-credits.js`；纯 SW 离线
  （HTTP 缓存被回收）下 `#/credits` 脚本加载失败。现已消除。

## 三、任务 B：gallery.mjs 剩余失败 —— 最终裁定：测试口径错误，已修正，9/9×3

### 取证（失败时的实际请求）
- 失败断言：`tests/e2e/gallery.mjs` 第 42 行"初始仅请求首图与下一张（预加载策略）"，
  阈值 `requested.length <= 3`。
- 实际请求（390px，程序记录）：**5 个**，全部为 `thumb/fixture-zj-1..5.webp`
 （initiator 均为 `img`）——即**可见缩略图 strip 的 5 张图**，无一张 `/full/` 大图。
- 原因：390px 下幻灯片经 `srcset` 取 640w 缩略图变体；缩略图 strip 在视口内全部加载。
  测试过滤器 `includes('fixture-zj')` 把缩略图计入了"大图预加载预算"，**统计口径错误**。
- 产品行为无违反：桌面 1440px 实测初始仅请求 `/full/fixture-zj-1.webp`（首图）+
  `/full/fixture-zj-2.webp`（预加载下一张），第 3–5 张 full 大图未被提前加载；
  2.2 未改动 gallery 加载逻辑。

### 修正（证据充分，未放宽标准）
- `tests/e2e/gallery.mjs` 第 42 行过滤器改为 `e.name.includes('/full/fixture-zj')`，
  **明确区分缩略图与大图请求**；断言保留、阈值 `<= 3` 不变。
  修正后该断言仍有实际约束力：若产品提前加载第 3–5 张 full 大图，仍会失败。
- 确定性 fixture（`~/workspace/cta_fixtures/cta-state-site`，持久目录）连续运行：
  **9/9、9/9、9/9**，退出码均为 0，可重复。

## 四、任务 C：360px 轮播控件 —— 发现真实交互问题，已修复

### 问题（真实，非数字游戏）
- 移动端（≤720px）固定底部标签栏 `.bottom-tabs`（`z-index:10`，高 60px）盖住了
  轮播控制组（`.car-ctl` z-index 3，`bottom:16px`）与圆点（`.car-dots` z-index 3，
  `bottom:30px`）：**控件不可见、不可点击**。
- 实证：`elementFromPoint` 在按钮中心命中 `SPAN.tab-icon`（标签栏），而非按钮；
  截图确认首屏底部无控件显示。此前验收测试用 `evaluate().click()`（合成点击，
  绕过命中检查）故未暴露。
- 结论：2.2 引入的真实交互故障（旧版无全屏轮播），属发布阻塞。

### 修复（最小范围，沿用项目既有模式）
- `assets/css/main.css` 移动端媒体查询内：
  `.car-ctl { bottom: calc(var(--tabbar-h) + 16px); }`
  `.car-dots { bottom: calc(var(--tabbar-h) + 30px); }`
  （与 `.toast` 的 `bottom:calc(var(--tabbar-h) + 16px)` 同模式；保留 S4-V1 的圆点/控件错开关系。）
- 未改布局结构、未改 z-index、未缩小字体。

### 验证
- 390px：控件底边 768 < 标签栏顶边 784，圆点底边 754 < 784；三按钮+圆点
  `elementFromPoint` 全部命中自身；**真实 `p.click('[data-car-next]')` 使轮播 0→1**（修复前不可能）。
- 截图 `~/workspace/cta_audit/shots/c-360fix-check.png`：圆点与三控件浮于标签栏之上，可见。
- 回归测试已补充进 `tests/e2e/cta22-accept.mjs`（3 项新断言，见 §五）。

## 五、任务 D：全量回归（本轮实际执行）

| 命令 | 退出码 | 通过/失败 | 备注 |
|---|---|---|---|
| `node tests/e2e/cta22-accept.mjs` | 0 | **42/42** | 39 原有 + 3 新增（控件在标签栏之上×2、真实点击切换×1）；中途 1 次"触摸滑动"失败系新增测试未恢复轮播状态所致，已修复（测试恢复状态），重跑 42/42 |
| `node --test tests/unit/*.test.mjs` | 0 | 39/0 | — |
| `node tests/e2e/lightbox-focus.mjs` | 0 | 16/16 | — |
| `node tests/e2e/gallery.mjs` | 0 | 9/9 | 修正后连续 3 次（含本轮回归 1 次） |
| `node tools/validate-data.mjs --check-index` | 0 | 42 条 0 错误 | 30 警告为既有留痕 |
| SW 更新+离线验证 | 0* | 21/21 实质 | 见 §二（*1 项脚本笔误另行实证通过） |

## 六、本轮代码/测试改动清单（未提交）

| 文件 | 改动 | 原因 |
|---|---|---|
| `sw.js` | CORE 加 `pages-credits.js`；VERSION/AV → `20261101b` | 任务 A：修复预缓存遗漏，按版本约定 bump |
| `assets/js/config.js` | assetV → `20261101b` | 版本四处一致 |
| `index.html` | 17 处 `?v=` → `20261101b` | 版本四处一致 |
| `assets/css/main.css` | 移动端 `.car-ctl`/`.car-dots` bottom 改为 `calc(var(--tabbar-h)+…)` | 任务 C：控件被标签栏遮挡的真实交互修复 |
| `tests/e2e/gallery.mjs` | 第 42 行过滤器改为 `/full/fixture-zj` | 任务 B：统计口径修正（断言与阈值不变） |
| `tests/e2e/cta22-accept.mjs` | +3 标签栏回归断言；新增测试恢复轮播状态 | 任务 C：补充相应测试 |

## 七、尚未执行（明确声明）

1. **K80 真机验收**：设备在线但命令集无浏览器控制能力，且站点未部署、手机无可达地址。
2. **屏幕阅读器人工走查**：无读屏环境；键盘/焦点已自动化验证（16/16）。
3. **真实线上 SW 更新流程**：未推送未部署，GitHub Pages 更新行为无法验证（§二为本地模拟）。
4. **离线滚动懒加载图片**：本轮未重测（2.1 已验证 SW 离线 reload）。
5. **`smoke.mjs` / `discover-state.mjs`**：需 Chromium，本环境无法启动（既有环境限制）。
6. **12 条 draft 正式评审**：未执行，转 published 需另行授权。

## 八、Git 状态核验

- 分支 `main`；本地 HEAD `c882743`；远程 main HEAD `9aa1c97`（`git ls-remote` 实测，未变化）。
- 本地领先 5 笔（`1c598d9`→`dfb6336`→`4667217`→`16b86e1`→`c882743`），**未推送、未部署**。
- 工作区：6 个已修改文件（上表）+ 1 个未跟踪文件（本报告），stash 0 条；
  辅助脚本已移出仓库（`~/workspace/sw_audit/`、`~/workspace/cta_audit/`）。
- 12 条候选：`status` 全为 `draft`（程序读取确认，共 12 条）。
- 版本一致性：`index.html` 17 处 `?v=20261101b`、`config.js` assetV `20261101b`、
  `sw.js` VERSION `cta-v1-20261101b`，四处一致。
- **本轮未创建提交**（按任务要求），所有改动保留在工作区待审核。

## 九、结论区分

**已实际测试**：§五全部六项（真实 Firefox / Node），§二 SW 更新与离线全流程，
§三 gallery 取证与 3 次 9/9，§四 360px 边界/命中/真实点击与截图。
**仅根据代码判断**：无（本轮所有关键结论均有浏览器实证）。
**尚未执行**：§七 6 项。

---
*本轮完成：最终阻塞项已修复并复验；停止，等待 ChatGPT 最终审核。*
