# Turnstile（2026-11-25）

- 後端：`worker/src/turnstile.js`（照 `~/workspace/.claude/turnstile-reference.md` 抄，判斷邏輯不改）。在 `worker/src/push.js` 的 `handlePushSubscribe`／`handlePushTest` 開頭（PUSH_RL 限流之後、讀 body／KV／發推播之前）呼叫。
- 受保護：`POST /api/push/subscribe`、`POST /api/push/test`。不加：`/api/track`（beacon）、`/api/track-stats`、oil cron。
- **跨網域（live.kvcc.me → live-api.kvcc.me）**：token 放 header `cf-turnstile-response`，`worker/src/cors.js` Allow-Headers 已加。不放 body 是因為 body 本身就是 PushSubscription 物件，不混欄位。這兩個請求本來就是 JSON POST 會 preflight，沒有額外成本。
- 前端：`src/lib/turnstile.js`（interaction-only；`TURNSTILE_SITEKEY` 常數，`PENDING_SITEKEY` 時不取 token）；`src/lib/push.js` 送出前取 token；403 時 `oil-notify.jsx` 跳「驗證失敗，請再試一次」。
- secret：`cd worker && wrangler secret put TURNSTILE_SECRET`。未設 → fail open＋warn；siteverify 連不上 → fail open。
- **只在瀏覽器請求強制**（Origin 為自家網域或 Sec-Fetch-Site same-origin/same-site）。
- **豁免上限**：攻擊者拿掉 Origin／Sec-Fetch-Site 就能繞過，Turnstile 只擋瀏覽器自動化；非瀏覽器流量靠 API_RL／PUSH_RL 與訂閱總量上限（MAX_SUBS=500）。升級路徑：App 改走 Passkey 或 mTLS（另開任務）。
- 測試：`cd worker && npm test`（`test/turnstile.test.mjs`，siteverify 用注入 fetch）。
