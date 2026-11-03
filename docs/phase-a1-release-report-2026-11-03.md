# A1-Release 发布报告（2026-11-03）

> 执行：Muse。用户已正式授权（总设计师批准 A1-Review 12/12 PASS 转正）。
> 发布流程：GitHub Pages（main 根目录），经 cta_replay.py 逐笔重放。

## 一、修改的 12 条目的地

| # | ID | 修改前 | 修改后 |
|---|---|---|---|
| 1 | wudadao-tianjin | draft | published |
| 2 | chengde-mountain-resort | draft | published |
| 3 | hulunbuir-grassland | draft | published |
| 4 | shenyang-imperial-palace | draft | published |
| 5 | harbin-central-street | draft | published |
| 6 | suzhou-humble-garden | draft | published |
| 7 | shapotou | draft | published |
| 8 | qingdao-badaguan-zhanqiao | draft | published |
| 9 | wuzhen | draft | published |
| 10 | mount-emei | draft | published |
| 11 | xijiang-miao-village | draft | published |
| 12 | hongcun | draft | published |

- 12 条 ID 与 A1-Review 报告一致，评审结论全部为 PASS，修改前程序复核全为 draft。
- 简介/名称/ID/坐标/分类维持评审稿原文；verificationNote 更新为"正式评审通过（2026-11-03）"。
- 未修改其他 30 条目的地的任何状态与内容；未新增未经审核的目的地。

## 二、数据校验结果

- `tools/validate-data.mjs --check-index`：**0 错误**，42 警告（全部为 published 带 verificationNote 的既有留痕模式，
  30 条为历史留痕，12 条为本次"正式评审通过"记录）。
- 索引重建：`destinations-index.json` 42 条，ID 去重 42，无 draft 残留。

统计核对（全部符合预期）：

| 指标 | 发布前 | 发布后 | 预期 | 一致 |
|---|---|---|---|---|
| published | 30 | 42 | 42 | ✓ |
| draft | 12 | 0 | 0 | ✓ |
| 省级覆盖 | 24/31 | 31/31 | 31 | ✓ |
| rural | 1 | 4 | 4 | ✓ |
| desert | 0 | 2 | 2 | ✓ |
| coastal | 2 | 3 | 3 | ✓ |

## 三、自动化测试结果

| 测试 | 结果 |
|---|---|
| `node --test tests/unit/*.test.mjs` | 39/39 通过 |
| `node tests/e2e/lightbox-focus.mjs` | 16/16 通过 |
| `node tests/e2e/gallery.mjs` | 9/9 通过 |
| `node tests/e2e/cta22-accept.mjs` | 42/42 通过 |

注：cta22-accept 初跑 38/42，4 项为硬编码旧数量（24省/93图）；更新期望值（31省/129图）后全过。
另发现**真实产品问题** 1 个：宏村图1许可 `CC BY-SA 3.0 igo` 不在 `LICENSE_URLS` 映射中，
致版权页缺许可链接；已修复（映射到 `https://creativecommons.org/licenses/by-sa/3.0/igo/`），断言恢复通过。

## 四、本地浏览器测试结果

- 12 条新目的地详情页：12/12（标题、≥3 图、版权入口正常，无"页面未找到"）。
- 发现页省份筛选（天津市）：正确返回五大道（另有 4 条"更多推荐"，为既有设计）。
- 规划页、搜索框正常；390px 移动端无横向溢出；全程 0 JS 错误。

## 五、Git 提交

| SHA | 内容 |
|---|---|
| `4635eba` | data(A1): 12条转published |
| `a48ce36` | fix(A1): 许可URL映射补CC BY-SA 3.0 igo |
| `4d81bd9` | chore(A1): 版本递增20261103a，索引重建42条 |
| `f8a73a6` | test(A1): 验收期望更新（24省→31省，93图→129图） |
| `a5ad195` | docs(A1): A阶段审计报告+A1正式评审报告 |

- 推送前远程：`c77e7c5`（与本地基线一致，无冲突）。
- 推送：7 笔全部 SHA-MATCH（中途 GitHub API 瞬时 502 两次，远程 ref 未动，重试成功）。
- 推送后远程：`a5ad195` = 本地 HEAD。

## 六、线上部署与验收

- Pages 部署后约 1 分钟，线上 `sw.js` = `cta-v1-20261103a`，与本地一致。
- 线上浏览器验收（真实 Firefox，移动视口）**8/8**：
  1. 12 条新目的地详情页 12/12 可访问，内容完整。
  2. 首页省份索引 31 条。
  3. rural 筛选含新条目。
  4. 版权页 129 张图片条目。
  5. 移动端无横向溢出。
  6. 线上 SW `cta-v1-20261103a` 已激活。
  7. 离线首页正常渲染（5 张轮播）。
  8. 全程 0 JS 错误。

## 七、失败项、遗留风险及回滚方案

- **失败项**：无（发现的 1 个许可映射问题已在发布前修复并验证）。
- **遗留风险**：
  - K80 真机、屏幕阅读器未执行（既有未完成项）。
  - 呼伦贝尔图片为通用草原景观（评审观察项，条目已明确代表点位口径）。
  - 旧客户端（20261101b）→新版的在线升级未直接观测；本地更新模拟已覆盖同类路径。
- **回滚方案**：如需回滚，`git revert` 5 笔提交（逆序），经 cta_replay.py 推送；
  线上 SW 版本号回退后旧缓存按设计清理。数据文件无破坏性变更，回滚安全。

---
*A1-Release 完成。未进入 A2 阶段，等待下一步指令。*
