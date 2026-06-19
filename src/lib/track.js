import { API_BASE } from '@/lib/config'

// Fire one "source opened" event per source per session into the kv Console
// (Worker → Analytics Engine, zero KV writes). Best-effort; never throws.
const sentThisLoad = new Set()

export function trackOpen(source) {
  if (!source || sentThisLoad.has(source)) return
  sentThisLoad.add(source)
  try {
    const key = `twlive-track-${source}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* sessionStorage unavailable — fall back to per-load dedup only */
  }
  try {
    fetch(`${API_BASE}/api/track`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'open', source }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
