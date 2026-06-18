<p align="center">
  <img src="public/favicon.svg" alt="reservoir-view" width="120" height="120">
</p>

# reservoir-view — 台灣水庫即時水位儀表板

[English](#english) | [繁體中文](#繁體中文)

---

## English

Taiwan reservoir real-time water level dashboard with a cyberpunk-style UI. Data sourced
from [Water Resources Agency (WRA)](https://fhy.wra.gov.tw/) open API.

### Features

- Real-time water level monitoring for 21 major reservoirs across Taiwan
- Animated water gauge with multi-layer waves, rising bubbles, sparkle particles, and gyroscope/mouse-reactive reflections
- Grid view with glassmorphism cards and status-colored glow borders
- Interactive map view (Leaflet) with color-coded reservoir markers
- Historical trend charts (Recharts)
- Search by reservoir name or basin; sort by name, water level %, or basin
- Dark mode with animated particle background and neon accents
- Responsive (mobile / tablet / desktop)

### Tech Stack

Vite · React 19 · Tailwind CSS v4 · Radix UI · TanStack Query (caching + auto-refresh) ·
Leaflet + react-leaflet · Recharts · Lucide React

### Getting Started

```bash
npm install
npm run dev      # http://localhost:5173/reservoir-view/
```

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run deploy` | Build and deploy to GitHub Pages |

### API

Data from WRA Open API (`https://fhy.wra.gov.tw/WraApi`):

- `GET /v1/Reservoir/Station?$filter=Importance eq 1` — list of major reservoirs
- `GET /v1/Reservoir/RealTimeInfo?$filter=StationNo eq '{id}'` — real-time data for a station

### License

MIT

---

## 繁體中文

台灣水庫即時水位儀表板，賽博龐克風格 UI。資料來自
[經濟部水利署（WRA）](https://fhy.wra.gov.tw/) 的開放 API。

### 功能

- 全台 21 座主要水庫的即時水位監看
- 動態水位計：多層波浪、上升氣泡、閃爍粒子，以及隨陀螺儀／滑鼠反應的反光
- 格狀檢視：玻璃擬態卡片 + 依狀態上色的光暈邊框
- 互動地圖（Leaflet）：依水情顏色標示各水庫
- 歷史趨勢圖（Recharts）
- 依水庫名稱或流域搜尋；依名稱、水位百分比或流域排序
- 深色模式：動態粒子背景 + 霓虹點綴
- 響應式（手機／平板／桌機）

### 技術

Vite · React 19 · Tailwind CSS v4 · Radix UI · TanStack Query（快取 + 自動刷新）·
Leaflet + react-leaflet · Recharts · Lucide React

### 開始

```bash
npm install
npm run dev      # http://localhost:5173/reservoir-view/
```

| 指令 | 說明 |
|---|---|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 打包到 `dist/` |
| `npm run preview` | 預覽 production build |
| `npm run deploy` | 打包並部署到 GitHub Pages |

### API

資料來自 WRA 開放 API（`https://fhy.wra.gov.tw/WraApi`）：

- `GET /v1/Reservoir/Station?$filter=Importance eq 1` — 主要水庫清單
- `GET /v1/Reservoir/RealTimeInfo?$filter=StationNo eq '{id}'` — 單一測站即時資料

### 授權

MIT
