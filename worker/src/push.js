import { json } from './cors'

// Self-hosted Web Push (VAPID + RFC 8291 aes128gcm) on Workers WebCrypto — no
// third-party push service, no per-message cost. Subscriptions live in KV; the
// oil-price cron (see scheduled handler) sends to them.

const utf8 = (s) => new TextEncoder().encode(s)
const concat = (...arrs) => {
  let len = 0
  for (const a of arrs) len += a.length
  const out = new Uint8Array(len)
  let o = 0
  for (const a of arrs) {
    out.set(a, o)
    o += a.length
  }
  return out
}
const b64uToBytes = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
  const bin = atob(s + pad)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return u
}
const bytesToB64u = (b) => {
  const u = new Uint8Array(b)
  let s = ''
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hashHex(s) {
  const d = await crypto.subtle.digest('SHA-256', utf8(s))
  return [...new Uint8Array(d)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// VAPID public key (uncompressed point 0x04||x||y) derived from the private JWK
// so the `k=` header always matches the signing key.
function vapidPublicKey(env) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK)
  return bytesToB64u(concat(new Uint8Array([4]), b64uToBytes(jwk.x), b64uToBytes(jwk.y)))
}

async function vapidJwt(endpoint, env) {
  const aud = new URL(endpoint).origin
  const header = bytesToB64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = bytesToB64u(utf8(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:contact@kvcc.me' })))
  const input = `${header}.${payload}`
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(input))
  return `${input}.${bytesToB64u(sig)}`
}

// RFC 8291 §3.1 payload encryption → RFC 8188 aes128gcm content-coding body.
async function encryptPayload(plaintextStr, p256dhB64u, authB64u) {
  const uaPublic = b64uToBytes(p256dhB64u) // 65
  const authSecret = b64uToBytes(authB64u) // 16

  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey)) // 65
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256))

  // IKM = HKDF(salt=auth, ikm=ecdh, info="WebPush: info\0"||ua||as, 32)
  const sharedKey = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits'])
  const ikmInfo = concat(utf8('WebPush: info\0'), uaPublic, asPublic)
  const ikm = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: ikmInfo }, sharedKey, 256))

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: utf8('Content-Encoding: aes128gcm\0') }, ikmKey, 128)
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: utf8('Content-Encoding: nonce\0') }, ikmKey, 96)
  const cek = await crypto.subtle.importKey('raw', new Uint8Array(cekBits), { name: 'AES-GCM' }, false, ['encrypt'])

  // single record: plaintext || 0x02 (last-record delimiter), no extra padding
  const plaintext = concat(utf8(plaintextStr), new Uint8Array([2]))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(nonceBits) }, cek, plaintext))

  // header: salt(16) | rs(4 BE = 4096) | idlen(1) | keyid(as_public) | ciphertext
  return concat(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPublic.length]), asPublic, ct)
}

// Send one push. Returns the upstream Response (201 = ok; 404/410 = gone).
export async function sendWebPush(sub, payloadObj, env) {
  const body = await encryptPayload(JSON.stringify(payloadObj), sub.keys.p256dh, sub.keys.auth)
  const jwt = await vapidJwt(sub.endpoint, env)
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey(env)}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '2419200',
    },
    body,
  })
}

// POST /api/push/subscribe — store (or refresh) a PushSubscription, keyed by a
// hash of its endpoint so re-subscribing the same browser overwrites.
export async function handlePushSubscribe(request, ctx, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  let sub
  try {
    sub = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: 'invalid subscription' }, 400)
  const id = await hashHex(sub.endpoint)
  await env.TDX_KV.put(
    `push:${id}`,
    JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, t: Date.now() }),
    { expirationTtl: 400 * 24 * 3600 }
  )
  return json({ ok: true })
}

// POST /api/push/test — send one test notification to the subscription in the
// body. Safe without auth: you can only target a subscription you already hold.
export async function handlePushTest(request, ctx, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  let sub
  try {
    sub = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: 'invalid subscription' }, 400)
  try {
    const r = await sendWebPush(sub, { title: '✅ 通知測試', body: 'TW Live 推播設定成功，油價更新時會通知你。', url: 'https://live.kvcc.me/oil' }, env)
    return json({ ok: r.ok, status: r.status })
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500)
  }
}

// Fan out a notification to every stored subscription; prune dead ones.
export async function pushToAll(env, payloadObj) {
  if (!env.TDX_KV) return { sent: 0, removed: 0 }
  let sent = 0
  let removed = 0
  let cursor
  do {
    const res = await env.TDX_KV.list({ prefix: 'push:', limit: 1000, cursor })
    for (const k of res.keys) {
      const raw = await env.TDX_KV.get(k.name)
      if (!raw) continue
      let sub
      try {
        sub = JSON.parse(raw)
      } catch {
        continue
      }
      try {
        const r = await sendWebPush(sub, payloadObj, env)
        if (r.status === 404 || r.status === 410) {
          await env.TDX_KV.delete(k.name)
          removed++
        } else if (r.ok) {
          sent++
        }
      } catch {
        /* network blip — leave the subscription for next time */
      }
    }
    cursor = res.list_complete ? null : res.cursor
  } while (cursor)
  return { sent, removed }
}
