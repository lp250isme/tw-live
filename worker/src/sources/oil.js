import { withEdgeCache } from '../cache'

// CPC (中油) reference retail fuel prices. Main consumer fuels only (NT$/L).
const URL = 'https://vipmbr.cpc.com.tw/opendata/mainprodlistprice'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json',
}
const WANT = ['98無鉛汽油', '95無鉛汽油', '92無鉛汽油', '超級柴油', '酒精汽油']

const num = (v) => (typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '')) || null)
function rocDate(s) {
  s = String(s || '')
  return s.length === 7 ? `${1911 + +s.slice(0, 3)}-${s.slice(3, 5)}-${s.slice(5, 7)}` : s
}

async function build(env) {
  let r = await fetch(URL, { headers: HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) r = await fetch(URL, { headers: HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) throw new Error(`CPC ${r.status}`)
  const j = await r.json()
  const arr = Array.isArray(j) ? j : Object.values(j).find(Array.isArray) || []
  const items = []
  for (const name of WANT) {
    const p = arr.find((x) => x['產品名稱'] === name)
    if (!p) continue
    items.push({
      id: name,
      name,
      group: '中油參考牌價',
      lat: null,
      lng: null,
      value: num(p['參考牌價_金額']),
      ts: rocDate(p['牌價生效日期']),
      meta: {},
    })
  }

  // Week-over-week change. CPC's feed has no previous price, so read the
  // snapshot the oil-watch cron keeps in KV (oil:snap). The price one period
  // before the current ts is snap.prevPrices once the cron has caught this
  // week's change, or snap.prices while it hasn't yet (snap still holds last
  // week) — either way, the prices from the period immediately before now.
  const curTs = items.map((i) => i.ts).filter(Boolean).sort().pop() || ''
  let prevPrices = null
  try {
    const snap = JSON.parse((await env.TDX_KV?.get('oil:snap')) || 'null')
    if (snap) prevPrices = snap.ts === curTs ? snap.prevPrices : snap.prices
  } catch {
    /* no snapshot yet — items ship without a delta */
  }
  if (prevPrices) {
    for (const it of items) {
      const prev = prevPrices[it.name]
      if (prev == null || it.value == null) continue
      const delta = Math.round((it.value - prev) * 10) / 10
      it.prev = prev
      it.delta = delta
      it.dir = delta > 0 ? 1 : delta < 0 ? -1 : 0
    }
  }
  return items
}

export function handleOil(request, ctx, env) {
  return withEdgeCache('oil', 30 * 60, () => build(env), ctx)
}
