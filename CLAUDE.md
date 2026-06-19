# CLAUDE.md — tw-live（台灣即時 / TW Live）

台灣政府開放資料即時 hub。前端 `live.kvcc.me`（Vite+React，Vercel）＋ 資料代理
Worker `live-api.kvcc.me`（`worker/`，Cloudflare）。前身是 reservoir-view 單一水庫
儀表板，已重構成多源 hub（11 源）+ Linear 風暗色設計。跨 repo 鐵則見 `~/workspace/CLAUDE.md`。

## 指令

```bash
npm run dev        # Vite dev（前端，base '/'）。本地要連 worker：VITE_API_BASE=http://127.0.0.1:8799
npm run build      # 前端 production build → dist/
vercel deploy --prod --yes --scope lp250ismes-projects   # 部署前端（CLI 直推，非 git 整合）
cd worker && npx wrangler deploy                          # 部署資料代理 Worker
```

## 架構

```
瀏覽器 (Vite SPA, live.kvcc.me)  ──fetch VITE_API_BASE+/api/<source>──▶  Worker (live-api.kvcc.me)
  src/lib/sources/<id>.js (前端 config)                                   worker/src/sources/<id>.js (adapter)
  通用元件吃 config 驅動                                                   打上游 + 正規化 + CORS + Cache API
                                                                          各政府 API（WRA/CWA/MOENV/TDX/台電/中油/YouBike）
```

### 新增一個資料源（兩個檔）
1. **Worker adapter** `worker/src/sources/<id>.js`：打上游、正規化成共用形狀、
   `return withEdgeCache('<tag>', ttl, build, ctx)`；在 `worker/src/index.js` 的 ROUTES 加 `/api/<id>`。
2. **前端 config** `src/lib/sources/<id>.js`：export default 一個 source 物件；在
   `src/lib/sources/index.js` 的 `sources[]` 與分類登記。完成。通用元件自動套用。

### 共用 normalized item 形狀
`{ id, name, group, lat, lng, value, ts, meta }`（lat/lng 可為 null=不上地圖）。
worker 回的是「已正規化的陣列」，前端 `fetchList` 直接 `fetch().json()`。

### source config 關鍵欄位
`id, category, name{zh,en}, tagline, accent, Icon(lucide), unit(字串或{zh,en}),
gauge('fill'|'ring'), max 或 gaugeMax(item)（比例弧分母）, views(['grid','map']),
refreshMs, tiers[{lt,key}], tierMeta{key:{label,color}}, formatValue, metricLabel,
searchFields(it)→[...含地址], sortOptions[{key,label}], hasDetail, fetchList, detailFields(item)`。
tier 由 `getTier(value, tiers)` 算（low-is-bad 或 high-is-bad 靠 tiers 排序）。
- **`worse: 'high'|'low'`（必填，若有 tiers 且單調）**：哪個極值是「該注意」的，決定
  ① 首頁/彙總列秀 max 還是 min ② 「只看異常」的 all-clear tier（high→tiers[0]、low→末項）。
  **weather 的 tier 非單調（冷↔熱兩端極端）、river/oil 無 tier → 不要標 `worse`**
  （→ 無「只看異常」、headline 改顯示範圍 min–max）。`src/lib/summary.js` 是唯一判斷處。
- **`overview(summary,{t})`（選填）**：覆寫首頁 tile headline 文案（youbike/parking 用
  `summary.sum` 顯示「共 X 可借/空位」）；不填走通用（worse 極值 + getTier 上色，或範圍）。

### 呈現模型（2026-06 改版：戰情室化）
- **首頁 = 即時 console**：`overview.jsx` 抓 worker `/api/summary`（一次 ~1KB，**別**抓 11 個
  完整清單＝~143KB），每 tile 顯示即時 headline + 狀態色點。`overviewHeadline()` 在 summary.js。
- **源頁 = 彙總列 + 密集列表**：`<SummaryBar>`（count·多數狀態·極值/範圍·N需注意）在最上；
  `<DataList>`/`<DataRow>` 一行一站（點/名/距離/比例條/值/徽章），一螢幕 8-12 筆。
  **環形 gauge 只在點開的 detail dialog 當主角**（清單不再用大 gauge 卡）。
- **「只看異常」**：源頁 toggle（`?only=alert`，僅 `hasSeverity`=有 tiers+worse 的源顯示），
  用 `isAbnormal()` 濾掉 all-clear tier。`src/lib/summary.js`：summarize/overviewHeadline/
  bestTierKey/isAbnormal/hasSeverity。

### 目前 11 源（src/lib/sources/）
water·river(WRA)｜weather·rain·uv·quake(CWA)｜air(MOENV)｜youbike·parking(TDX/blob)｜power(台電)｜oil(中油)。
分類：水情/氣象/環境/防災/交通/能源/生活。

## Worker 重點（worker/）
- `lib/cwa.js`/`lib/wra.js`：共用上游 helper（瀏覽器 header 過 F5 WAF、控制字元清理、
  WRA 的 **TWD97→WGS84** 逆投影）。CWA key 從 `env.CWA_KEY`（無則公開示範 key）。
- `cache.js withEdgeCache`：**fresh(TTL) + stale(24h) 雙層**；上游失敗回 stale，
  暫時性 5xx 不變使用者錯誤。**零 KV 寫入**（KV 只存 TDX OAuth token，≈1 寫/日）。
- `summary.js`：`/api/summary` 聚合端點——呼叫 11 個 list handler→`.json()`→**通用數值 reduce**
  （count/sum/mean/min/max，不碰 tier，避免與前端 config 漂移），整包 `withEdgeCache('summary',300)`。
  首頁吃它（~1KB，**別**讓首頁抓 11 個完整清單＝~143KB）。**新增源時 `LIST_HANDLERS` 要加一筆。**
- `push.js`：**自架 Web Push**（VAPID + RFC8291 aes128gcm，全用 WebCrypto，無第三方、零成本）。
  `/api/push/subscribe` 存訂閱進 KV `push:*`；`/api/push/test` 對 body 的訂閱發一則（只能測自己，免 gate）；
  `pushToAll` fan-out + 清 410/404 死訂閱。VAPID 私鑰 secret `VAPID_PRIVATE_JWK`、`VAPID_SUBJECT`；
  前端公鑰在 `src/lib/push.js`（base64url uncompressed point，公開）。**加密已用 http_ece 互通驗證過**。
- `oil-watch.js`：`checkOilUpdate` 抓 oil 比對 KV `oil:lastTs`，**生效日變動才推**（首次只 seed 不推、推完寫 lastTs 不重推）。
  **無自己的 cron**（帳號達 5-cron 上限）→ 開 `/api/cron/oil-check`（`OIL_CRON_KEY` header gate），由 **shortlink worker 每日 02:00 UTC cron 借觸發**。
- 前端 PWA：`public/sw.js`(push/notificationclick)、修正後的 `manifest.json`、油價頁 `<OilNotify>` 訂閱入口
  （**iOS 必須先「加到主畫面」**才有 PushManager，元件會偵測 standalone 給對應指引）。
- `track.js`：`/api/track` 點擊情報寫 KV `twlog:*`（每 session 每源一次，含使用者授權定位的 la/ln）、
  `/api/track-stats` 聚合；go.kvcc.me Console 的「TW Live」分頁讀它。
- secrets：`CWA_KEY`、`MOENV_KEY`(選)、`TDX_CLIENT_ID/SECRET`（`wrangler secret put`）。

## 設計（DESIGN.md）
Linear 風：近黑 `#08090a`、indigo accent、hairline border、Inter；環形量表（value/max 比例弧）；
無霓虹/動態邊框。主題 light/dark/auto 寫 `<html data-theme>`（index.html 有 pre-paint script）。
改 UI 先讀 `DESIGN.md` + 載 liquid-glass-design / ui-ux-pro-max skill。

## 已知坑
- **WRA/台電/中油上游偶發暫時性 5xx**（WRA 520、台電 202）：fetch 各重試一次 + Cache stale 兜底。
- **opendata.wra / data.moenv 有 F5 WAF**：要帶完整瀏覽器 header（CF Worker edge 打得過）。
- **CWA 紫外線(O-A0005)** 只有 StationID+UV，要 join 氣象站(O-A0001) 拿名稱座標。
- **油價 endpoint** 要小寫 `/opendata/mainprodlistprice`（大寫會 302）。
- 搜尋輸入用 local state（非 URL 往返）才不會打斷中文 IME；URL 改 debounce 同步。
- Vercel 專案內部名仍是 reservoir-view（不影響，網域 live.kvcc.me）；repo 預設分支 **master**。
- 公車/捷運/台鐵即時到站、發票號碼、預報類不適合「站點+值+地圖」模型，要另設計版面。
