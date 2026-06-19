import { json } from './cors'
import { withEdgeCache } from './cache'

// Click intelligence: records "source opened" events into KV (twlog:*), one
// write per source-open per session (deduped client-side) — low volume, well
// within the free tier. Aggregated on read for the kv Console. (Analytics
// Engine would need Workers Paid, so KV is used instead.)
const VALID_SOURCES = new Set([
  'water', 'river', 'weather', 'rain', 'air', 'quake', 'uv', 'youbike', 'parking', 'power', 'oil',
])
const TTL = 90 * 24 * 60 * 60 // keep 90 days

export async function handleTrack(request, ctx, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body = {}
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad body' }, 400)
  }

  // Accept a batch (whole session: { sources:[...] }) or a single { source }.
  // The client flushes once per session → one KV write covering every source.
  const raw = Array.isArray(body.sources) ? body.sources : [body.source]
  const sources = [...new Set(raw.map((s) => String(s || '')).filter((s) => VALID_SOURCES.has(s)))]
  if (!sources.length) return json({ ok: false, ignored: true })

  // Optional GPS coords (present only if the client granted geolocation).
  const coord = (v, lim) =>
    typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim ? Math.round(v * 1e5) / 1e5 : null
  const lat = coord(body.lat, 90)
  const lng = coord(body.lng, 180)
  const hasGeo = lat != null && lng != null

  if (env.TDX_KV) {
    const now = Date.now()
    const rev = String(1e15 - now).padStart(16, '0')
    const key = `twlog:${rev}:${crypto.randomUUID().slice(0, 8)}`
    const cf = request.cf || {}
    // Source list + coords live in metadata (ss/la/ln) so track-stats counts
    // from the list scan without a per-key GET.
    const metadata = { ss: sources, c: cf.country || 'XX' }
    if (hasGeo) {
      metadata.la = lat
      metadata.ln = lng
    }
    const write = env.TDX_KV.put(
      key,
      JSON.stringify({ t: now, sources, country: cf.country || 'XX', city: cf.city || '', ...(hasGeo ? { lat, lng } : {}) }),
      { expirationTtl: TTL, metadata }
    )
    if (ctx?.waitUntil) ctx.waitUntil(write)
    else await write
  }

  return json({ ok: true })
}

// GET /api/track-stats → counts by source + by country, aggregated from KV
// metadata (no per-key GET). Edge-cached 5 min so the Console doesn't re-scan.
export function handleTrackStats(request, ctx, env) {
  return withEdgeCache(
    'track-stats',
    300,
    async () => {
      const bySource = {}
      const byCountry = {}
      const points = []
      const MAX_POINTS = 500
      let total = 0
      if (env.TDX_KV) {
        let cursor
        do {
          const res = await env.TDX_KV.list({ prefix: 'twlog:', limit: 1000, cursor })
          for (const k of res.keys) {
            const m = k.metadata || {}
            // new keys carry a source array (ss); legacy keys a single (s)
            const ss = Array.isArray(m.ss) ? m.ss : m.s ? [m.s] : []
            for (const s of ss) {
              bySource[s] = (bySource[s] || 0) + 1
              total++
            }
            if (m.c) byCountry[m.c] = (byCountry[m.c] || 0) + 1
            // keys sort most-recent-first (rev = 1e15 - now), so the first
            // MAX_POINTS geocoded entries are the latest. time decoded from key.
            if (m.la != null && m.ln != null && points.length < MAX_POINTS) {
              const rev = Number(k.name.split(':')[1])
              points.push({ lat: m.la, lng: m.ln, s: ss[0], t: Number.isFinite(rev) ? 1e15 - rev : null })
            }
          }
          cursor = res.list_complete ? null : res.cursor
        } while (cursor)
      }
      return { app: 'tw-live', total, bySource, byCountry, points, generatedAt: new Date().toISOString() }
    },
    ctx
  )
}
