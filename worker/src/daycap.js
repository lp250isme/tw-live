// Best-effort per-colo daily counter on the Cache API (NOT KV — zero KV writes).
// Returns true while the colo is under `cap` for today (UTC). Fails open when the
// Cache API is unavailable (tests / local) or errors.
export async function takeDaily(tag, cap, now = Date.now()) {
  const cache = globalThis.caches?.default
  if (!cache) return true
  try {
    const day = new Date(now).toISOString().slice(0, 10)
    const key = new Request(`https://edge-cache.twlive/daycap/${tag}/${day}`)
    const hit = await cache.match(key)
    const n = hit ? Number(await hit.text()) || 0 : 0
    if (n >= cap) return false
    await cache.put(key, new Response(String(n + 1), { headers: { 'cache-control': 'public, max-age=86400' } }))
    return true
  } catch {
    return true
  }
}

// Cached read-through number (Cache API, `ttl` seconds). Used to avoid a KV list()
// on every request when only an approximate count is needed.
export async function cachedNumber(tag, ttl, producer) {
  const cache = globalThis.caches?.default
  const key = new Request(`https://edge-cache.twlive/num/${tag}`)
  if (cache) {
    try {
      const hit = await cache.match(key)
      if (hit) return Number(await hit.text()) || 0
    } catch { /* fall through */ }
  }
  const n = await producer()
  if (cache) {
    try {
      await cache.put(key, new Response(String(n), { headers: { 'cache-control': `public, max-age=${ttl}` } }))
    } catch { /* ignore */ }
  }
  return n
}
