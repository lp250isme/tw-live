// Shared WRA (Water Resources Agency) open-data helper: browser-like headers to
// pass the F5 WAF, control-char stripping, and a TWD97 (EPSG:3826) → WGS84
// inverse transverse-Mercator conversion (WRA gives projected coords only).
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'zh-TW,zh;q=0.9',
  Referer: 'https://opendata.wra.gov.tw/',
}

function stripControlChars(text) {
  let out = ''
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) >= 32) out += text[i]
  return out
}

export async function wraGetJSON(url) {
  // WRA's edge occasionally throws transient 5xx (520) — retry once.
  let r = await fetch(url, { headers: HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) r = await fetch(url, { headers: HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) throw new Error(`WRA upstream ${r.status}`)
  const data = JSON.parse(stripControlChars(await r.text()))
  return Array.isArray(data) ? data : Object.values(data).find(Array.isArray) || []
}

export const num = (v) => {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

// TWD97 TM2 (lon0=121°, k0=0.9999, FE=250000, GRS80) → [lat, lng] WGS84
export function twd97ToWgs84(E, N) {
  if (E == null || N == null || Number.isNaN(E) || Number.isNaN(N)) return [null, null]
  const a = 6378137.0
  const b = 6356752.314245
  const lon0 = (121 * Math.PI) / 180
  const k0 = 0.9999
  const dx = 250000
  const e = Math.sqrt(1 - (b * b) / (a * a))
  const x = E - dx
  const y = N
  const M = y / k0
  const mu = M / (a * (1 - e ** 2 / 4 - (3 * e ** 4) / 64 - (5 * e ** 6) / 256))
  const e1 = (1 - Math.sqrt(1 - e ** 2)) / (1 + Math.sqrt(1 - e ** 2))
  const fp =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu)
  const ep2 = ((e * a) / b) ** 2
  const C1 = ep2 * Math.cos(fp) ** 2
  const T1 = Math.tan(fp) ** 2
  const R1 = (a * (1 - e ** 2)) / Math.pow(1 - (e * Math.sin(fp)) ** 2, 1.5)
  const N1 = a / Math.sqrt(1 - (e * Math.sin(fp)) ** 2)
  const D = x / (N1 * k0)
  const lat =
    fp -
    ((N1 * Math.tan(fp)) / R1) *
      (D ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 3 * C1 ** 2 - 252 * ep2) * D ** 6) / 720)
  const lon =
    lon0 +
    (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5) / 120) /
      Math.cos(fp)
  return [(lat * 180) / Math.PI, (lon * 180) / Math.PI]
}
