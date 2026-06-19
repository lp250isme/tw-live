import { json } from './cors'
import { withEdgeCache } from './cache'

// Click intelligence: records "source opened" events into KV (twlog:*), one
// write per source-open per session (deduped client-side) — low volume, well
// within the free tier. Aggregated on read for the kv Console. (Analytics
// Engine would need Workers Paid, so KV is used instead.)
const VALID_SOURCES = new Set(['water', 'air', 'weather', 'youbike', 'parking'])
const VALID_EVENTS = new Set(['open'])
const TTL = 90 * 24 * 60 * 60 // keep 90 days

export async function handleTrack(request, ctx, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body = {}
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad body' }, 400)
  }

  const event = String(body.event || 'open')
  const source = String(body.source || '')
  if (!VALID_EVENTS.has(event) || !VALID_SOURCES.has(source)) {
    return json({ ok: false, ignored: true })
  }

  if (env.TDX_KV) {
    const now = Date.now()
    const rev = String(1e15 - now).padStart(16, '0')
    const key = `twlog:${rev}:${crypto.randomUUID().slice(0, 8)}`
    const cf = request.cf || {}
    const write = env.TDX_KV.put(
      key,
      JSON.stringify({ t: now, source, country: cf.country || 'XX', city: cf.city || '' }),
      { expirationTtl: TTL, metadata: { s: source, c: cf.country || 'XX' } }
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
      let total = 0
      if (env.TDX_KV) {
        let cursor
        do {
          const res = await env.TDX_KV.list({ prefix: 'twlog:', limit: 1000, cursor })
          for (const k of res.keys) {
            const s = k.metadata?.s
            const c = k.metadata?.c
            if (s) {
              bySource[s] = (bySource[s] || 0) + 1
              total++
            }
            if (c) byCountry[c] = (byCountry[c] || 0) + 1
          }
          cursor = res.list_complete ? null : res.cursor
        } while (cursor)
      }
      return { app: 'tw-live', total, bySource, byCountry, generatedAt: new Date().toISOString() }
    },
    ctx
  )
}
