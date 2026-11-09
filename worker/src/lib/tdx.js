// TDX OAuth2 (client_credentials). The access token lasts ~24h; TDX rate-limits
// the auth endpoint, so we cache the token in KV (≈1 write/day) and reuse it.
const TOKEN_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token'
const API_BASE = 'https://tdx.transportdata.tw/api/basic'
const KV_KEY = 'tdx_access_token'

async function fetchToken(env) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.TDX_CLIENT_ID,
    client_secret: env.TDX_CLIENT_SECRET,
  })
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!r.ok) throw new Error(`TDX auth ${r.status}`)
  const j = await r.json()
  return { token: j.access_token, expiresIn: j.expires_in || 86400 }
}

// Token lookup order: isolate memory → Cache API → KV (backup). KV is NOT on the
// critical path: when the daily 1k KV write quota is burned (e.g. by /api/track
// spam) put() throws, and we still serve the token from memory/Cache.
const CACHE_KEY = new Request('https://edge-cache.twlive/tdx-token')
let mem = null // { token, exp(ms) }

async function getToken(env) {
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET) throw new Error('TDX credentials not set')
  if (mem && mem.exp > Date.now()) return mem.token
  try {
    const hit = await caches.default.match(CACHE_KEY)
    if (hit) {
      const t = await hit.text()
      if (t) return remember(t, 3600)
    }
  } catch {
    /* fall through */
  }
  if (env.TDX_KV) {
    try {
      const cached = await env.TDX_KV.get(KV_KEY)
      if (cached) return remember(cached, 3600)
    } catch {
      /* KV quota/outage — just mint a new one */
    }
  }
  const { token, expiresIn } = await fetchToken(env)
  // expire a little early to avoid edge-of-life failures
  const ttl = Math.max(120, expiresIn - 600)
  remember(token, ttl)
  try {
    await caches.default.put(CACHE_KEY, new Response(token, { headers: { 'cache-control': `public, max-age=${ttl}` } }))
  } catch {
    /* ignore */
  }
  if (env.TDX_KV) {
    try {
      await env.TDX_KV.put(KV_KEY, token, { expirationTtl: ttl })
    } catch {
      /* write quota exhausted — memory/Cache still hold it */
    }
  }
  return token
}

// Cap memory lifetime (KV/Cache copies may be older than we know) so a revoked
// token is retried within an hour at worst; 401 path below also clears it.
function remember(token, ttlSec) {
  mem = { token, exp: Date.now() + Math.min(ttlSec, 3600) * 1000 }
  return token
}

async function dropToken(env) {
  mem = null
  try {
    await caches.default.delete(CACHE_KEY)
  } catch {
    /* ignore */
  }
  try {
    await env.TDX_KV?.delete(KV_KEY)
  } catch {
    /* ignore */
  }
}

export async function tdxGet(env, path) {
  const token = await getToken(env)
  const url = `${API_BASE}${path}`
  let r = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cf: { cacheTtl: 0 } })
  // token might have been revoked early — refresh once
  if (r.status === 401) {
    await dropToken(env)
    const fresh = await getToken(env)
    r = await fetch(url, { headers: { authorization: `Bearer ${fresh}` }, cf: { cacheTtl: 0 } })
  }
  if (!r.ok) throw new Error(`TDX ${r.status} for ${path}`)
  return r.json()
}
