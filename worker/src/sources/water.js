import { withEdgeCache } from '../cache'
import { RESERVOIR_COORDS } from '../data/reservoir-coords'

// WRA open data (opendata.wra.gov.tw). Two datasets, joined by reservoir code:
//   45501 水庫水情資料  — realtime current effective storage + water level
//   32726 水庫基本資料  — name + effective capacity (the % denominator)
// The platform sits behind an F5 WAF that 503s bare/datacenter requests, but
// passes browser-like requests, so we send realistic headers.
const REALTIME = 'https://opendata.wra.gov.tw/api/v2/2be9044c-6e44-4856-aad5-dd108c2e6679?sort=_importdate%20asc&format=JSON'
const BASIC = 'https://opendata.wra.gov.tw/api/v2/708a43b0-24dc-40b7-9ed2-fca6a291e7ae?sort=_importdate%20asc&format=JSON'

const WRA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'zh-TW,zh;q=0.9',
  Referer: 'https://opendata.wra.gov.tw/',
}

// Drop raw control chars (code < 32) that occasionally appear inside WRA string
// fields and would break JSON.parse. Structural JSON whitespace is unneeded, so
// removing all sub-space code points is safe. Written with numeric codes only
// to avoid embedding literal control characters in source.
function stripControlChars(text) {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) >= 32) out += text[i]
  }
  return out
}

async function fetchWraJSON(url) {
  const r = await fetch(url, { headers: WRA_HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) throw new Error(`WRA upstream ${r.status}`)
  const text = await r.text()
  return JSON.parse(stripControlChars(text))
}

const num = (v) => {
  if (v == null) return null
  const n = parseFloat(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

async function build() {
  const [realtime, basic] = await Promise.all([fetchWraJSON(REALTIME), fetchWraJSON(BASIC)])

  // latest realtime row per reservoir id
  const latest = new Map()
  for (const r of Array.isArray(realtime) ? realtime : []) {
    const id = String(r.reservoiridentifier ?? '')
    if (!id) continue
    const prev = latest.get(id)
    if (!prev || String(r.observationtime ?? '') > String(prev.observationtime ?? '')) latest.set(id, r)
  }

  const items = []
  for (const b of Array.isArray(basic) ? basic : []) {
    const id = String(b['水庫代碼'] ?? '')
    const name = b['水庫名稱']
    if (!id || !name) continue
    const capacity = num(b['目前有效容量']) ?? num(b['設計有效容量'])
    const rt = latest.get(id)
    const current = rt ? num(rt.effectivewaterstoragecapacity) : null
    let pct = null
    if (capacity && capacity > 0 && current != null) {
      pct = Math.max(0, Math.min(105, (current / capacity) * 100))
      pct = Math.round(pct * 10) / 10
    }
    const coord = RESERVOIR_COORDS[name]
    items.push({
      id,
      name,
      group: b['地區別'] ?? null,
      lat: coord ? coord[0] : null,
      lng: coord ? coord[1] : null,
      value: pct,
      ts: rt?.observationtime ?? null,
      meta: {
        capacity,
        current,
        waterlevel: rt ? num(rt.waterlevel) : null,
        river: b['河川名稱'] ?? null,
        agency: b['機關名稱'] ?? null,
        town: b['鄉鎮市區名稱'] ?? null,
      },
    })
  }

  // live reservoirs first (have a reading), then by storage desc
  items.sort((a, b) => {
    if ((a.value == null) !== (b.value == null)) return a.value == null ? 1 : -1
    return (b.value ?? 0) - (a.value ?? 0)
  })
  return items
}

export function handleWater(request, ctx) {
  return withEdgeCache('water', 30 * 60, build, ctx)
}
