# 测试说明

## 已自动化

- `node tools/validate-data.mjs`：正例（仓库内全部数据）须 0 错误；反例（坐标越界、非法 id、未定义 theme、禁止字段 ticketPrice）须报错且退出码 1。反例在临时目录构造，不污染仓库数据。
- `node --test tests/unit/*.test.mjs`：规划服务（天数/日期合法性、逐日连续、主题优先、无候选不编造）、数据服务（搜索、组合筛选）、天气归一化（正常载荷与坏载荷）。
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
