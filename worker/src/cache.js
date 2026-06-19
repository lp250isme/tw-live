import { CORS } from './cors'

// Edge cache via the Cache API (NOT KV — KV's free-tier write quota would be
// the bottleneck for a polled proxy; Cache API has no write quota).
// Two layers per source:
//   - fresh  (ttlSeconds): served while warm.
//   - stale  (24h): served as a fallback when the upstream fetch fails, so a
//                   transient upstream 5xx never becomes a user-facing error.
const KEY = (tag) => new Request(`https://edge-cache.twlive/${tag}`, { method: 'GET' })

function jsonResponse(data, cacheControl, cacheTag) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'x-cache': cacheTag,
      ...CORS,
    },
  })
}

function retag(res, tag) {
  const h = new Headers(res.headers)
  h.set('x-cache', tag)
  return new Response(res.body, { status: res.status, headers: h })
}

export async function withEdgeCache(cacheTag, ttlSeconds, producer, ctx) {
  const cache = caches.default
  const freshKey = KEY(cacheTag)
  const staleKey = KEY(`${cacheTag}:stale`)

  const hit = await cache.match(freshKey)
  if (hit) return retag(hit, 'HIT')

  let data
  try {
    data = await producer()
  } catch (err) {
    const stale = await cache.match(staleKey)
    if (stale) return retag(stale, 'STALE')
    throw err
  }

  const fresh = jsonResponse(data, `public, max-age=${ttlSeconds}`, 'MISS')
  const stale = jsonResponse(data, 'public, max-age=86400', 'STALE-STORE')
  const put = Promise.all([cache.put(freshKey, fresh.clone()), cache.put(staleKey, stale.clone())])
  if (ctx?.waitUntil) ctx.waitUntil(put)
  else await put
  return fresh
}
