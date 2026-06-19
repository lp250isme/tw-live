import { API_BASE } from '@/lib/config'

// Click intelligence, write-frugal: opened sources accumulate in memory during
// the session (SPA navigation between sources costs nothing) and are flushed in
// ONE beacon when the tab is hidden/closed — so a whole session = 1 KV write on
// the Worker, not one per source. Coords (if geolocation granted) ride along.
const round5 = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 1e5) / 1e5 : null)

const pending = new Set()
let coords = null
let listening = false

const sentKey = (s) => `twlive-track-${s}`
const alreadySent = (s) => {
  try {
    return !!sessionStorage.getItem(sentKey(s))
  } catch {
    return false
  }
}
const markSent = (s) => {
  try {
    sessionStorage.setItem(sentKey(s), '1')
  } catch {
    /* ignore */
  }
}

function flush() {
  if (!pending.size) return
  const sources = [...pending]
  const body = JSON.stringify({ sources, ...(coords || {}) })
  let ok = false
  try {
    if (navigator.sendBeacon) {
      ok = navigator.sendBeacon(`${API_BASE}/api/track`, new Blob([body], { type: 'application/json' }))
    }
    if (!ok) {
      fetch(`${API_BASE}/api/track`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch {
    /* best-effort */
  }
  sources.forEach(markSent)
  pending.clear()
}

function ensureListener() {
  if (listening) return
  listening = true
  // visibilitychange→hidden is the reliable analytics flush point (tab switch,
  // close, navigate away, mobile background); pagehide as a belt-and-braces.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', flush)
}

export function trackOpen(source, c) {
  if (!source || pending.has(source) || alreadySent(source)) return
  pending.add(source)
  const lat = round5(c?.lat)
  const lng = round5(c?.lng)
  if (lat != null && lng != null) coords = { lat, lng }
  ensureListener()
}
