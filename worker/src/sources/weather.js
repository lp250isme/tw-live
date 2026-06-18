import { withEdgeCache } from '../cache'

// CWA automatic weather stations (O-A0001-001): ~850 stations, hourly temp /
// humidity / weather / wind. The Authorization below is CWA's public demo key
// published on data.gov.tw; set a private CWA_KEY secret to override.
const PUBLIC_KEY = 'rdec-key-123-45678-011121314'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json',
}

const num = (v) => {
  if (v == null) return null
  const n = parseFloat(String(v).trim())
  return Number.isFinite(n) ? n : null
}

function wgs84(geo) {
  const list = geo?.Coordinates || []
  const c = list.find((x) => x.CoordinateName === 'WGS84') || list[0]
  return c ? [num(c.StationLatitude), num(c.StationLongitude)] : [null, null]
}

async function build(env) {
  const key = (env && env.CWA_KEY) || PUBLIC_KEY
  const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${key}`
  const r = await fetch(url, { headers: HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) throw new Error(`CWA upstream ${r.status}`)
  const data = await r.json()
  const stations = data?.records?.Station || []
  const items = []
  for (const s of stations) {
    const we = s.WeatherElement || {}
    let temp = num(we.AirTemperature)
    if (temp != null && temp <= -90) temp = null // CWA uses -99 for invalid
    const [lat, lng] = wgs84(s.GeoInfo)
    if (lat == null || lng == null) continue
    if (temp == null) continue
    items.push({
      id: s.StationId,
      name: s.StationName,
      group: s.GeoInfo?.CountyName ?? null,
      lat,
      lng,
      value: temp,
      ts: s.ObsTime?.DateTime ?? null,
      meta: {
        humidity: num(we.RelativeHumidity),
        weather: we.Weather || null,
        wind: num(we.WindSpeed),
        pressure: num(we.AirPressure),
        precip: num(we.Now?.Precipitation),
        town: s.GeoInfo?.TownName ?? null,
      },
    })
  }
  items.sort((a, b) => (b.value ?? -999) - (a.value ?? -999))
  return items
}

export function handleWeather(request, ctx, env) {
  return withEdgeCache('weather', 10 * 60, () => build(env), ctx)
}
