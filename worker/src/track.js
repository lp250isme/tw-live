import { json } from './cors'

// Click intelligence: records a "source opened" event into Analytics Engine
// (zero KV writes). Fired client-side once per source open. The kv Console
// queries the tw_live_events dataset to show which panels are popular.
const VALID_SOURCES = new Set(['water', 'air', 'weather', 'youbike', 'parking'])
const VALID_EVENTS = new Set(['open'])

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

  const cf = request.cf || {}
  if (env.EVENTS) {
    try {
      env.EVENTS.writeDataPoint({
        indexes: [source], // sampling/grouping key
        blobs: [
          source, // blob1
          event, // blob2
          String(cf.country || 'XX'), // blob3
          String(cf.colo || ''), // blob4
          String(cf.city || ''), // blob5
        ],
        doubles: [1], // double1 = count
      })
    } catch {
      /* analytics is best-effort */
    }
  }

  return json({ ok: true })
}
