// Public open-data proxy. The payloads are public, but CORS is locked to our
// own origins so other sites can't embed this worker in-browser as a free
// proxy. (curl/server-side still works — that's what per-IP rate limiting in
// index.js is for; CORS is a browser-only control.)
const DEFAULT_ORIGIN = 'https://live.kvcc.me'

// Allow the whole kvcc ecosystem (live.kvcc.me 自己 + go.kvcc.me Console、kvcc.me
// 等任何 *.kvcc.me 子網域 + 備援域 + 本機 dev)，其餘外站擋掉。Console 在 go.kvcc.me
// 跨來源讀 /api/track-stats，之前只放 live.kvcc.me 把它擋成「讀取失敗」。
function isAllowed(origin) {
  if (!origin) return false
  let h
  try { h = new URL(origin).hostname } catch { return false }
  return h === 'kvcc.me' || h.endsWith('.kvcc.me') || h === 'kvcc.dpdns.org' || h === 'localhost' || h === '127.0.0.1'
}

export function allowOrigin(request) {
  const o = request?.headers?.get('Origin')
  return o && isAllowed(o) ? o : DEFAULT_ORIGIN
}

export const CORS = {
  'Access-Control-Allow-Origin': DEFAULT_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

// Single CORS chokepoint — re-stamp any response (including cached ones, whose
// headers are otherwise immutable) with the request's allow-listed origin.
export function withCors(resp, request) {
  const h = new Headers(resp.headers)
  h.set('Access-Control-Allow-Origin', allowOrigin(request))
  h.set('Vary', 'Origin')
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h })
}

export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: { ...CORS, 'Access-Control-Allow-Origin': allowOrigin(request), Vary: 'Origin' },
  })
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...CORS,
      ...extraHeaders,
    },
  })
}
