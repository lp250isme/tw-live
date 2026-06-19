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

async function getToken(env) {
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET) throw new Error('TDX credentials not set')
  if (env.TDX_KV) {
    const cached = await env.TDX_KV.get(KV_KEY)
    if (cached) return cached
  }
  const { token, expiresIn } = await fetchToken(env)
  if (env.TDX_KV) {
    // expire a little early to avoid edge-of-life failures
    await env.TDX_KV.put(KV_KEY, token, { expirationTtl: Math.max(120, expiresIn - 600) })
  }
  return token
}

export async function tdxGet(env, path) {
  const token = await getToken(env)
  const url = `${API_BASE}${path}`
  let r = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cf: { cacheTtl: 0 } })
  // token might have been revoked early — refresh once
  if (r.status === 401 && env.TDX_KV) {
    await env.TDX_KV.delete(KV_KEY)
    const fresh = await getToken(env)
    r = await fetch(url, { headers: { authorization: `Bearer ${fresh}` }, cf: { cacheTtl: 0 } })
  }
  if (!r.ok) throw new Error(`TDX ${r.status} for ${path}`)
  return r.json()
}
