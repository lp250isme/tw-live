// Weekly CPC price history, sourced from CPC's own history page (lists ~7 weeks
// incl. unchanged weeks, authoritative). We merge it into KV so the series keeps
// growing past the 7 weeks CPC shows. Powers the detail-dialog sparkline.
const HIST_URL = 'https://www.cpc.com.tw/historyprice.aspx?n=2890'
const HKEY = 'oil:history'
const COLS = ['92無鉛汽油', '95無鉛汽油', '98無鉛汽油', '超級柴油'] // CPC history column order
const CAP = 70
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// Rows look like: 115/06/22 | 31.4 | 32.9 | 34.9 | 30.3  (ROC year, 4 prices)
function parseCpc(html) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
  const re = /(\d{3})\/(\d{1,2})\/(\d{1,2})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g
  const out = []
  let m
  while ((m = re.exec(t))) {
    const ts = `${1911 + +m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
    const p = {}
    COLS.forEach((c, i) => {
      const v = parseFloat(m[4 + i])
      if (!isNaN(v)) p[c] = v
    })
    if (Object.keys(p).length === COLS.length) out.push({ ts, p })
  }
  return out
}

export async function getHistory(env) {
  try {
    return JSON.parse((await env.TDX_KV?.get(HKEY)) || 'null')
  } catch {
    return null
  }
}

// Fetch CPC history and merge by date into the stored series. fail-safe: any
// problem leaves the existing series untouched.
export async function refreshOilHistory(env) {
  if (!env.TDX_KV) return null
  let rows = []
  try {
    const r = await fetch(HIST_URL, { headers: { 'User-Agent': UA }, cf: { cacheTtl: 0 } })
    if (r.ok) rows = parseCpc(await r.text())
  } catch {
    /* fail-safe */
  }
  if (!rows.length) return getHistory(env)
  const byTs = new Map(((await getHistory(env)) || []).map((e) => [e.ts, e]))
  for (const row of rows) byTs.set(row.ts, row) // CPC authoritative for these weeks
  const merged = [...byTs.values()].sort((a, b) => (a.ts < b.ts ? -1 : 1)).slice(-CAP)
  await env.TDX_KV.put(HKEY, JSON.stringify(merged))
  return merged
}
