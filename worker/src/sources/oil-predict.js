// Next-week CPC price *prediction* (the public floating-price formula:
// Platts Dubai 70% + Brent 30%, 80% of the week-over-week move). CPC announces
// officially Sunday noon; these third-party calculators publish the same forecast
// a few days earlier. We read two of them and cross-check.
//
// Model: gasoline grades (92/95/98) always move by the SAME amount (the formula
// adjusts all gasoline equally; grade gaps are fixed premiums), so a prediction
// is just two numbers — { gasoline, diesel } deltas in NT$/L (negative = 降).
//
// fail-safe: any parse/fetch problem returns null for that source. A prediction
// is only emitted once the source's weekly Platts/FX data is in (early in the
// week it reads 尚無數據 and we return null — that avoids echoing the change that
// already took effect this Monday).

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

async function text(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, cf: { cacheTtl: 0 } })
  if (!r.ok) throw new Error(`${url} ${r.status}`)
  return r.text()
}

// "降1" / "降0.7" / "漲0.5" / "-0.7" / "+2.7" / "- 0.7 元" -> signed number (降/跌/- => negative)
function amt(s) {
  const m = String(s).match(/(漲|升|\+|降|跌|-)\s*(\d+(?:\.\d+)?)/)
  if (!m) return null
  return (/[降跌-]/.test(m[1]) ? -1 : 1) * parseFloat(m[2])
}

// transmit-info via r.jina.ai (clean server-side render). The "下週油價預估" table
// gives per-grade 預估幅度; gated on 本週原油價格 being populated (else it's just
// echoing this week's already-applied change).
async function transmit() {
  try {
    const t = await text('https://r.jina.ai/https://gasoline.transmit-info.com/')
    if (/本週原油價格[:：]\s*\**\s*尚無數據/.test(t)) return null
    const g = t.match(/中油92無鉛\s*\|[^|]*\|[^|]*\|\s*([^|\n]+?)\s*\|/)
    const d = t.match(/中油柴油\s*\|[^|]*\|[^|]*\|\s*([^|\n]+?)\s*\|/)
    const gasoline = g ? amt(g[1]) : null
    const diesel = d ? amt(d[1]) : null
    if (gasoline == null && diesel == null) return null
    return { gasoline, diesel }
  } catch {
    return null
  }
}

// goodlife is SSR plain text (worker can fetch directly). Exposes 汽油/柴油預計調整;
// gated on 本週匯率 being populated.
async function goodlife() {
  try {
    let t = await text('https://gas.goodlife.tw/')
    t = t.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
    if (/本週匯率[:：]\s*尚無資料/.test(t)) return null
    const g = t.match(/汽油預計調整[:：]?\s*([+\-－﹣]?\s*\d+(?:\.\d+)?)\s*元/)
    const d = t.match(/柴油預計調整[:：]?\s*([+\-－﹣]?\s*\d+(?:\.\d+)?)\s*元/)
    const gasoline = g ? amt(g[1].replace(/[－﹣]/, '-')) : null
    const diesel = d ? amt(d[1].replace(/[－﹣]/, '-')) : null
    if (gasoline == null && diesel == null) return null
    return { gasoline, diesel }
  } catch {
    return null
  }
}

const near = (a, b) => a != null && b != null && Math.abs(a - b) <= 0.11

// Returns { byFuel:{gasoline,diesel}, sources:[...], agree } or null.
// Cross-check: when both sources give a value for a fuel they must agree (±0.1);
// a conflict on a fuel drops that fuel (don't push a number we're unsure of).
export async function fetchPrediction() {
  const [tm, gl] = await Promise.all([transmit(), goodlife()])
  const sources = []
  if (tm) sources.push('transmit')
  if (gl) sources.push('goodlife')
  if (!sources.length) return null

  const pick = (key) => {
    const a = tm?.[key]
    const b = gl?.[key]
    if (a != null && b != null) return near(a, b) ? Math.round(((a + b) / 2) * 10) / 10 : null
    return a != null ? a : b != null ? b : null
  }
  const gasoline = pick('gasoline')
  const diesel = pick('diesel')
  if (gasoline == null && diesel == null) return null

  const byFuel = {}
  if (gasoline != null) byFuel.gasoline = gasoline
  if (diesel != null) byFuel.diesel = diesel
  const agree = sources.length === 2 && (tm.gasoline == null || gl.gasoline == null || near(tm.gasoline, gl.gasoline)) && (tm.diesel == null || gl.diesel == null || near(tm.diesel, gl.diesel))
  return { byFuel, sources, agree }
}
