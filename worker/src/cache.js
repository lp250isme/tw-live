import { CORS } from './cors'

// Edge cache via the Cache API (NOT KV — KV's free-tier write quota would be
// the bottleneck for a polled proxy; Cache API has no write quota). Keyed by a
// synthetic stable URL per source. Serves a cached JSON Response when warm,
// otherwise runs producer(), caches it with the given TTL, and returns it.
export async function withEdgeCache(cacheTag, ttlSeconds, producer, ctx) {
  const cache = caches.default
  const cacheKey = new Request(`https://edge-cache.twlive/${cacheTag}`, { method: 'GET' })

  const hit = await cache.match(cacheKey)
  if (hit) {
    const h = new Headers(hit.headers)
    h.set('x-cache', 'HIT')
    return new Response(hit.body, { status: hit.status, headers: h })
  }

  const data = await producer()
  const res = new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${ttlSeconds}`,
      'x-cache': 'MISS',
      ...CORS,
    },
  })
  // store a clone with the same cache-control so the edge honours the TTL
  const put = cache.put(cacheKey, res.clone())
  if (ctx?.waitUntil) ctx.waitUntil(put)
  else await put
  return res
}
