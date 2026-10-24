# 测试说明

## 已自动化

- `node tools/validate-data.mjs`：正例（仓库内全部数据）须 0 错误；反例（坐标越界、非法 id、未定义 theme、禁止字段 ticketPrice）须报错且退出码 1。反例在临时目录构造，不污染仓库数据。
- `node --test tests/unit/*.test.mjs`：规划服务（天数/日期合法性、逐日连续、主题优先、无候选不编造）、数据服务（搜索、组合筛选）、天气归一化（正常载荷与坏载荷）、天气降级（stale 兜底/无缓存抛错/新鲜缓存不重复请求）、候选审计口径与重点文本断言（含反例）。
- `node tools/audit-candidates.mjs`：候选数据与图片资产一致性审计（ID 唯一、必填字段、坐标范围、禁止字段、6 条重点文本断言、审核表状态口径、图片引用存在性/WebP 有效性/许可与登记表一致/禁止引用已排除图片/全图哈希去重），只读，失败退出码 1。
- 天气真实联调：以张家界坐标真实请求 Open-Meteo 并归一化成功（2026-10-22 实测，返回 7 天预报）；这只证明无密钥链路可用，不证明和风链路（无密钥未接入）。

## 浏览器冒烟（每轮发布前执行并记录）

清单：首页渲染与空状态文案、发现页筛选交互、详情页（不存在 ID 的未找到页）、规划表单拦截、收藏切换与刷新持久化、360px 宽无横向滚动、控制台无未处理异常。

口径：本地 `python3 -m http.server` + 浏览器实测记为“本地浏览器测试”；托管浏览器/桌面视口不等于手机真机，真机未测必须明说。

## 尚未覆盖

- 和风天气真实调用（待用户注册并以 Secret 注入 Worker 后单独一轮实测）。
- GitHub Pages 线上验收（仓库创建与推送后执行，含 assetV 一致性抽查）。
- 手机真机验收。

## 真实浏览器冒烟（2026-10-22 起）

环境：本机 Chromium 152（/opt/meta-chromium/chrome）+ playwright-core（tests/e2e，独立 package，不进站点构建）。
沙箱限制：Chromium 对回环地址启用 Local Network Access 检查，直连 127.0.0.1/localhost 被 ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS 拦截；启动参数、权限授予、企业策略、host-resolver 映射均实测无效。因此冒烟用 Playwright 请求拦截把 http://cta.test:8124/** 映射到夹具目录文件：渲染与 JS 执行为真实浏览器，HTTP 传输层由拦截代替；真实 HTTP 由 python http.server + curl 全量 200 另行验证。
夹具：把站点复制到 /tmp/cta-e2e-site，放入 1 条 published 测试记录（候选张家界数据 + 本地生成色块图，alt/credit 明确标注 fixture），跑该副本的 build-index 与 validate --check-index 通过后，删除其全图文件以验证破图降级。
运行：`cd tests/e2e && npm install && node smoke.mjs`（16 项断言：首页/筛选/搜索/详情/天气失败降级/破图降级/收藏/规划/移动端 375 无溢出/无未捕获错误）。
真实 HTTP 冒烟（2026-10-22 补）：Firefox（Playwright 官方构建）直连 python http.server 的 http://127.0.0.1:8124 全量 16/16 通过（tests/e2e/smoke-http.mjs，站点文件零拦截，仅天气 API 被 abort 模拟失败）。Chromium 在本沙箱仍被 LNA 拦截回环，继续用 smoke.mjs 的拦截方案。夹具可按本节步骤重建（/tmp 会被清理）。
夹具隔离注意（2026-10-23 补）：构建任何 /tmp 夹具后必须删除夹具副本中的 data/destinations/first-batch.json 再运行 build-index，否则正式集 30 条会混入夹具索引（曾导致冒烟 11/16 的假回归，隔离后恢复 16/16）。
发现页状态恢复专项（2026-10-22 补）：tests/e2e/discover-state.mjs，夹具为 30 条 published 色块记录（/tmp/cta-state-site，CTA_FIXTURE 可覆盖）；CTA_BROWSER=firefox（http.server 8125）或 chromium（拦截）运行，断言场景 A（筛选+滚动恢复）/B（首页往返不受影响）/C（二次往返不累积错误）共 8 项。
天气关闭降级专项（2026-10-22 补）：tests/e2e/weather-off.mjs，夹具为同上数据但 config 的 weatherEnabled 置 false（/tmp/cta-wxoff-site，http.server 8126），断言详情主体完整、天气区明确不可用、收藏与规划可用，共 6 项。
画廊专项（2026-10-24 补）：tests/e2e/gallery.mjs，复用状态夹具（8125），但夹具中张家界记录须替换为 5 张色块图变体（fixture-zj-0..4）；断言滑动计数、仅预加载下一张、放大层打开/翻页/关闭，共 9 项，双浏览器运行。
图片性能测量（2026-10-24 补）：tests/e2e/perf-images.mjs，CTA_PERF_BASE/CTA_PERF_SITE 指向被测站点副本（http.server 8130，390px 视口、冷缓存、回环无节流）；统计各路由图片请求数与字节（按文件大小）及首图完成时间，仅用于同环境前后对比。
