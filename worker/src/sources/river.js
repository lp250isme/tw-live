import { withEdgeCache } from '../cache'
import { wraGetJSON, twd97ToWgs84, num } from '../lib/wra'

// WRA river water level: realtime level (25768) joined with station info (22227)
// — name / river / alert thresholds / TWD97 coords — by station id.
const REALTIME = 'https://opendata.wra.gov.tw/api/v2/73c4c3de-4045-4765-abeb-89f9f9cd5ff0?sort=_importdate%20asc&format=JSON'
const STATION = 'https://opendata.wra.gov.tw/api/v2/c4acc691-7416-40ca-9464-292c0c00da92?sort=_importdate%20asc&format=JSON'

async function build() {
  const [rt, st] = await Promise.all([wraGetJSON(REALTIME), wraGetJSON(STATION)])
  const level = new Map()
  for (const r of rt) {
    const id = String(r.stationid ?? '')
    if (id) level.set(id, r)
  }
  const items = []
  for (const s of st) {
    const id = String(s.basinidentifier ?? '')
    const r = id && level.get(id)
    if (!r) continue
    const wl = num(r.waterlevel)
    if (wl == null) continue
    let lat = null
    let lng = null
    const xy = String(s.locationbytwd97_xy || '').trim().split(/\s+/)
    if (xy.length === 2) {
      const [la, lo] = twd97ToWgs84(parseFloat(xy[0]), parseFloat(xy[1]))
      if (la != null && la > 21 && la < 26.5 && lo > 119 && lo < 122.5) {
        lat = Math.round(la * 1e6) / 1e6
        lng = Math.round(lo * 1e6) / 1e6
      }
    }
    items.push({
      id,
      name: s.observatoryname || id,
      group: s.rivername || null,
      lat,
      lng,
      value: wl,
      ts: r.datetime || null,
      meta: {
        river: s.rivername || null,
        alert1: num(s.alertlevel1),
        alert2: num(s.alertlevel2),
        alert3: num(s.alertlevel3),
      },
    })
  }
  items.sort((a, b) => (b.value ?? -999) - (a.value ?? -999))
  return items
}

export function handleRiver(request, ctx, env) {
  return withEdgeCache('river', 10 * 60, build, ctx)
}
