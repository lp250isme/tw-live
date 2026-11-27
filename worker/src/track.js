import { json } from './cors'
import { withEdgeCache } from './cache'
import { takeDaily, limitedAll } from './daycap'

// Click intelligence: records "source opened" events into KV (twlog:*), one
// write per source-open per session (deduped client-side) — low volume, well
// within the free tier. Aggregated on read for the kv Console. (Analytics
// Engine would need Workers Paid, so KV is used instead.)
const VALID_SOURCES = new Set([
  'water', 'river', 'weather', 'rain', 'air', 'quake', 'uv', 'youbike', 'parking', 'power', 'oil',
])
const TTL = 90 * 24 * 60 * 60 // keep 90 days
// ponytail: anonymous KV writes are capped by (a) TRACK_RL 2/60s/IP in index.js and (b) a
// best-effort per-colo daily cap (Cache API counter, 0 KV writes) → at most
// DAILY_CAP × (colos reached) writes/day, vs 1000/day account quota. Excess events are
// dropped (ok:true, sampled:false). Upgrade path if real analytics matter: D1 or Analytics Engine.
export const DAILY_CAP = 20
// 2026-11-27: the per-colo cap multiplies by colos reached (Tor exits sit in dozens of
// non-TW colos). Real visitors are overwhelmingly in TW, so non-TW events get a smaller
// per-colo budget, and TRACK_ALL_RL (key "all", per location) caps bursts that race the
// non-atomic Cache API counter. Dropped events still answer 200 — invisible to users.
export const FOREIGN_DAILY_CAP = 5

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

  const cf = request.cf || {}
  const tw = !cf.country || cf.country === 'TW'
  if (
    env.TDX_KV &&
    !(await limitedAll(env.TRACK_ALL_RL)) &&
    (await takeDaily(tw ? 'track' : 'track-intl', tw ? DAILY_CAP : FOREIGN_DAILY_CAP))
  ) {
    const now = Date.now()
    const rev = String(1e15 - now).padStart(16, '0')
    const key = `twlog:${rev}:${crypto.randomUUID().slice(0, 8)}`
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
    return json({ ok: true })
  }

  return json({ ok: true, sampled: false })
}

// GET /api/track-stats → counts by source + by country, aggregated from KV
// metadata (no per-key GET). Edge-cached 5 min so the Console doesn't re-scan.
// Owner-only (Console): requires x-stats-key == env.STATS_KEY; fails closed if unset, so
// anonymous callers can't amplify KV list() ops via cache misses across colos.
export function handleTrackStats(request, ctx, env) {
  if (!env.STATS_KEY || request.headers.get('x-stats-key') !== env.STATS_KEY) {
    return json({ error: 'forbidden' }, 403)
  }
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
