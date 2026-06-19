// Shared CWA (Central Weather Administration) open-data helper. The
// Authorization key comes from env.CWA_KEY (set as a secret); falls back to
// CWA's public demo key published on data.gov.tw.
const PUBLIC_KEY = 'rdec-key-123-45678-011121314'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json',
}

export async function cwaGet(env, dataid, extra = '') {
  const key = (env && env.CWA_KEY) || PUBLIC_KEY
  const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${key}${extra}`
  const r = await fetch(url, { headers: HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) throw new Error(`CWA ${dataid} ${r.status}`)
  return r.json()
}

export const num = (v) => {
  if (v == null) return null
  const n = parseFloat(String(v).trim())
  return Number.isFinite(n) ? n : null
}

// pull WGS84 lat/lng out of a CWA GeoInfo block
export function wgs84(geo) {
  const list = geo?.Coordinates || []
  const c = list.find((x) => x.CoordinateName === 'WGS84') || list[0]
  return c ? [num(c.StationLatitude), num(c.StationLongitude)] : [null, null]
}
