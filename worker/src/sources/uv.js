import { withEdgeCache } from '../cache'
import { cwaGet, num, wgs84 } from '../lib/cwa'

// CWA UV index (O-A0005-001) carries only StationID + UVIndex, so we join it
// with the weather-station metadata (O-A0001-001) for name + coordinates.
async function build(env) {
  const [uvd, std] = await Promise.all([cwaGet(env, 'O-A0005-001'), cwaGet(env, 'O-A0001-001')])
  const meta = new Map()
  for (const s of std?.records?.Station || []) {
    const [lat, lng] = wgs84(s.GeoInfo)
    meta.set(String(s.StationId), { name: s.StationName, lat, lng, county: s.GeoInfo?.CountyName })
  }
  const we = uvd?.records?.weatherElement || {}
  const loc = we.location || []
  const items = []
  for (const u of loc) {
    const m = meta.get(String(u.StationID)) || {}
    const v = num(u.UVIndex)
    if (v == null || m.lat == null) continue
    items.push({
      id: String(u.StationID),
      name: m.name || String(u.StationID),
      group: m.county ?? null,
      lat: m.lat,
      lng: m.lng,
      value: v,
      ts: we.Date ?? null,
      meta: {},
    })
  }
  items.sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
  return items
}

export function handleUV(request, ctx, env) {
  return withEdgeCache('uv', 60 * 60, () => build(env), ctx)
}
