import { withEdgeCache } from '../cache'
import { cwaGet, num, wgs84 } from '../lib/cwa'

// CWA automatic rainfall stations (O-A0002-001). value = last-hour rainfall (mm).
async function build(env) {
  const d = await cwaGet(env, 'O-A0002-001')
  const stations = d?.records?.Station || []
  const items = []
  for (const s of stations) {
    const re = s.RainfallElement || {}
    let hr = num(re.Past1hr?.Precipitation)
    if (hr != null && hr < 0) hr = null // -99 invalid
    const [lat, lng] = wgs84(s.GeoInfo)
    if (lat == null || lng == null || hr == null) continue
    items.push({
      id: s.StationId,
      name: s.StationName,
      group: s.GeoInfo?.CountyName ?? null,
      lat,
      lng,
      value: hr,
      ts: s.ObsTime?.DateTime ?? null,
      meta: {
        now: num(re.Now?.Precipitation),
        day: num(re.Past24hr?.Precipitation),
        town: s.GeoInfo?.TownName ?? null,
      },
    })
  }
  items.sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
  return items
}

export function handleRain(request, ctx, env) {
  return withEdgeCache('rain', 10 * 60, () => build(env), ctx)
}
