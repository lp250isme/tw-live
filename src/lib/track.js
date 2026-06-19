import { API_BASE } from '@/lib/config'

// Fire one "source opened" event per source per session into the kv Console.
// When the user has granted geolocation, the (rounded) coords ride along so the
// Console can map where the app is used — coords are only ever present if the
// user already opted into location for nearby-sorting. Best-effort; never throws.
const sentThisLoad = new Set()

const round5 = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 1e5) / 1e5 : null)

export function trackOpen(source, coords) {
  if (!source || sentThisLoad.has(source)) return
  sentThisLoad.add(source)
  try {
    const key = `twlive-track-${source}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* sessionStorage unavailable — fall back to per-load dedup only */
  }
  const body = { event: 'open', source }
  const lat = round5(coords?.lat)
  const lng = round5(coords?.lng)
  if (lat != null && lng != null) {
    body.lat = lat
    body.lng = lng
  }
  try {
    fetch(`${API_BASE}/api/track`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
