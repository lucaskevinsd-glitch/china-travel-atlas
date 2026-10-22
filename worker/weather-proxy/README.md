# weather-proxy（未部署）

Cloudflare Worker 模板：把和风天气密钥隔离在服务端，前端只调用本 Worker。

部署（待用户完成和风注册并拍板天气路线后单独一轮执行）：

1. `npx wrangler deploy` 前，先把目的地白名单按已核验数据填入 `worker.js` 的 `DESTINATIONS`。
2. 密钥用 `wrangler secret put QWEATHER_API_HOST` 与 `wrangler secret put QWEATHER_API_KEY` 注入，**不要**写进任何文件或聊天。
3. 前端 `assets/js/config.js` 改：`weatherProvider: 'worker-qweather'`、`weatherWorkerBase: 'https://<worker 域名>'`，并同步递增 assetV 三处。
4. 在和风控制台设置月度预算告警（免费额度 5 万次/月，超出按量计费）。
5. 上线后实测 3 个目的地：返回位置正确、页面显示更新时间与“数据来源：和风天气”标注、断开 Worker 时详情页降级为占位不崩溃。
