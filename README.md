<p align="center">
  <img src="public/icon-dark.png" alt="TW Live" width="120" height="120" />
</p>

<h1 align="center">台灣即時 · TW Live</h1>
<p align="center">台灣政府開放資料的即時戰情室 — Taiwan government open data, live.</p>

<p align="center">
  <a href="#english">English</a> · <a href="#繁體中文">繁體中文</a>
</p>

<p align="center">
  🔗 <b>Live:</b> <a href="https://live.kvcc.me">live.kvcc.me</a>
</p>

---

## English

A real-time dashboard that aggregates Taiwan's government open data into one cyberpunk "situation room" — reservoirs, YouBike, and more on the way (weather, air quality, transit, energy). A liquid gauge, an interactive map, and deep-linkable category pages, all in light / dark / auto themes and bilingual (中 / EN).

### Features
- **Live data, one place** — each domain is a card-driven dashboard with grid + map views.
- **Reservoirs** — real-time storage % of Taiwan's major reservoirs with the signature liquid gauge.
- **YouBike** — live bike availability across ~1,700 Taipei stations on an interactive map.
- **Deep links** — every category, view, search and sort lives in the URL (`/water?view=map`).
- **Built to grow** — new sources are a small config + a Worker adapter away.

### Tech
- **Frontend** — Vite + React 19 + Tailwind CSS v4, React Query, React Router, Leaflet, Recharts. Deployed on Vercel.
- **Data proxy** — a Cloudflare Worker (`live-api.kvcc.me`) that holds API keys, normalizes each source, adds CORS, and edge-caches via the Cache API.
- **Data** — [政府資料開放平臺 / Taiwan Open Data](https://data.gov.tw), WRA, and more.

### Data sources
| Domain | Source | Key |
|--------|--------|-----|
| Reservoirs | WRA open data (datasets 45501 + 32726) | none |
| YouBike | Taipei YouBike 2.0 | none |
| Weather / quake (planned) | CWA Open Data | free key |
| Air quality (planned) | MOENV Open Data | free key |
| Transit (planned) | TDX | free OAuth |

### More by kv
See the in-app **More by kv** section, or visit [kvcc.me](https://kvcc.me).

### Credit
Open data © their respective agencies via Taiwan's open data platform. Built by kv.

---

## 繁體中文

把台灣政府公開的即時資料匯集成一個 cyberpunk「戰情室」——水庫水情、YouBike，更多陸續加入（天氣、空品、交通、能源）。液態水位儀、互動地圖、可深連結的分類頁，支援淺色 / 深色 / 自動主題與中英雙語。

### 功能
- **即時資料一站匯集** — 每個領域都是卡片驅動的儀表板，含列表 + 地圖視圖。
- **水庫** — 全台主要水庫即時蓄水率，招牌液態水位儀。
- **YouBike** — 台北約 1,700 站即時可借車輛，互動地圖一覽。
- **深連結** — 分類、視圖、搜尋、排序全寫進網址（`/water?view=map`）。
- **可擴充** — 新資料源只需一份 config + 一個 Worker adapter。

### 技術
- **前端** — Vite + React 19 + Tailwind CSS v4、React Query、React Router、Leaflet、Recharts，部署於 Vercel。
- **資料代理** — Cloudflare Worker（`live-api.kvcc.me`）負責藏 API key、正規化各來源、處理 CORS、用 Cache API 邊緣快取。
- **資料** — [政府資料開放平臺](https://data.gov.tw)、水利署等。

### 更多作品
見 App 內 **More by kv** 區塊，或前往 [kvcc.me](https://kvcc.me)。

### 致謝
開放資料著作權屬各主管機關（經由政府資料開放平臺）。Built by kv.
