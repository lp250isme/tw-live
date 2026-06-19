import { withEdgeCache } from '../cache'
import { cwaGet, num } from '../lib/cwa'

// CWA significant earthquake reports (E-A0015-001). Event-shaped: each item is
// a recent quake with magnitude + epicenter coords + time + report text.
async function build(env) {
  const d = await cwaGet(env, 'E-A0015-001', '&limit=30')
  const eq = d?.records?.Earthquake || []
  const items = eq.map((e) => {
    const ei = e.EarthquakeInfo || {}
    const ep = ei.Epicenter || {}
    const mg = ei.EarthquakeMagnitude || {}
    return {
      id: String(e.EarthquakeNo),
      name: ep.Location || '地震',
      group: ei.OriginTime ? String(ei.OriginTime).slice(0, 16).replace('T', ' ') : null,
      lat: num(ep.EpicenterLatitude),
      lng: num(ep.EpicenterLongitude),
      value: num(mg.MagnitudeValue),
      ts: ei.OriginTime || null,
      meta: {
        depth: num(ei.FocalDepth),
        content: e.ReportContent || null,
        image: e.ReportImageURI || null,
        web: e.Web || null,
      },
    }
  })
  items.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')))
  return items
}

export function handleQuake(request, ctx, env) {
  return withEdgeCache('quake', 5 * 60, () => build(env), ctx)
}
