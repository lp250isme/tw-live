import { withEdgeCache } from '../cache'

// YouBike 2.0 Taipei — keyless, CORS-open Azure blob, refreshed ~1 min.
const TPE = 'https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json'

async function build() {
  const r = await fetch(TPE, { cf: { cacheTtl: 0 } })
  if (!r.ok) throw new Error(`YouBike upstream ${r.status}`)
  const data = await r.json()
  return (Array.isArray(data) ? data : [])
    .filter((s) => String(s.act) === '1')
    .map((s) => ({
      id: `tpe-${s.sno}`,
      name: String(s.sna || '').replace('YouBike2.0_', ''),
      group: s.sarea,
      lat: parseFloat(s.latitude),
      lng: parseFloat(s.longitude),
      value: s.available_rent_bikes ?? null,
      ts: s.updateTime || s.mday || null,
      meta: {
        ret: s.available_return_bikes ?? null,
        total: s.Quantity ?? null,
        addr: s.ar ?? null,
      },
    }))
}

export function handleYouBike(request, ctx) {
  return withEdgeCache('youbike', 60, build, ctx)
}
