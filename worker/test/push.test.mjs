import test from 'node:test'
import assert from 'node:assert/strict'
import { isAllowedPushEndpoint, pushToAll, handlePushSubscribe } from '../src/push.js'

test('isAllowedPushEndpoint', () => {
  const ok = [
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://web.push.apple.com/QX',
    'https://updates.push.services.mozilla.com/wpush/v2/x',
    'https://wns2-par02p.notify.windows.com/w/?token=x',
  ]
  const bad = [
    'http://fcm.googleapis.com/x',
    'https://x.push.apple.com.evil.com/x',
    'https://evilpush.apple.com.evil.com/',
    'https://push.apple.com/x', // bare apex isn't a push host
    'https://evil.com/fcm.googleapis.com',
    'https://fcm.googleapis.com@evil.com/x',
    'https://user:p@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'not a url',
    '',
  ]
  for (const u of ok) assert.equal(isAllowedPushEndpoint(u), true, u)
  for (const u of bad) assert.equal(isAllowedPushEndpoint(u), false, u)
})

async function realSub(host = 'fcm.googleapis.com', n = 0) {
  const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const raw = Buffer.from(await crypto.subtle.exportKey('raw', k.publicKey)).toString('base64url')
  return {
    endpoint: `https://${host}/send/${n}`,
    keys: { p256dh: raw, auth: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url') },
  }
}

async function mkEnv(entries) {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])
  const store = new Map(entries.map((e) => [e.name, e]))
  const calls = { get: 0, put: [], del: [] }
  return {
    calls,
    VAPID_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey('jwk', kp.privateKey)),
    TDX_KV: {
      async list() {
        return { keys: [...store.values()].map((e) => ({ name: e.name, metadata: e.metadata })), list_complete: true }
      },
      async get(n) { calls.get++; return store.get(n)?.value ?? null },
      async put(n, v, o) { calls.put.push([n, v, o]); store.set(n, { name: n, value: v, metadata: o?.metadata }) },
      async delete(n) { calls.del.push(n); store.delete(n) },
    },
  }
}

function mockFetch(status = 201) {
  const orig = globalThis.fetch
  const urls = []
  globalThis.fetch = async (u) => { urls.push(u); return new Response(null, { status: typeof status === 'function' ? status(u) : status }) }
  return { urls, restore: () => (globalThis.fetch = orig) }
}

test('pushToAll: metadata entries need no KV get; legacy entries fall back to get', async () => {
  const a = await realSub('fcm.googleapis.com', 1)
  const b = await realSub('fcm.googleapis.com', 2)
  const env = await mkEnv([
    { name: 'push:a', value: JSON.stringify(a), metadata: { sub: a } },
    { name: 'push:b', value: JSON.stringify(b) }, // legacy: no metadata
  ])
  const m = mockFetch()
  try {
    const r = await pushToAll(env, { title: 't' })
    assert.deepEqual(r, { sent: 2, removed: 0, skipped: 0 })
    assert.equal(env.calls.get, 1)
    assert.equal(m.urls.length, 2)
  } finally { m.restore() }
})

test('pushToAll: skips disallowed endpoints, removes 410', async () => {
  const good = await realSub('fcm.googleapis.com', 1)
  const evil = await realSub('x.push.apple.com.evil.com', 2)
  const env = await mkEnv([
    { name: 'push:good', value: '', metadata: { sub: good } },
    { name: 'push:evil', value: JSON.stringify(evil) },
  ])
  const m = mockFetch(410)
  try {
    const r = await pushToAll(env, {})
    assert.equal(m.urls.length, 1)
    assert.deepEqual(env.calls.del, ['push:good'])
    assert.equal(r.removed, 1)
  } finally { m.restore() }
})

test('pushToAll: stops at the subrequest budget and reports skipped', async () => {
  const entries = []
  for (let i = 0; i < 60; i++) { const s = await realSub('fcm.googleapis.com', i); entries.push({ name: `push:${i}`, value: '', metadata: { sub: s } }) }
  const env = await mkEnv(entries)
  const m = mockFetch()
  const warn = console.warn; console.warn = () => {}
  try {
    const r = await pushToAll(env, {})
    assert.equal(m.urls.length, 44) // 1 list + 44 fetches = 45
    assert.equal(r.sent, 44)
    assert.equal(r.skipped, 16)
  } finally { m.restore(); console.warn = warn }
})

test('pushToAll: honors custom budget param', async () => {
  const entries = []
  for (let i = 0; i < 60; i++) { const s = await realSub('fcm.googleapis.com', i); entries.push({ name: `push:${i}`, value: '', metadata: { sub: s } }) }
  const env = await mkEnv(entries)
  const m = mockFetch()
  const warn = console.warn; console.warn = () => {}
  try {
    const r = await pushToAll(env, {}, 10)
    assert.equal(m.urls.length, 9) // 1 list + 9 fetches = 10
    assert.equal(r.skipped, 51)
  } finally { m.restore(); console.warn = warn }
})

test('subscribe: rejects bad endpoint / oversize, stores metadata for good one', async () => {
  const env = await mkEnv([])
  const post = (body) => handlePushSubscribe(new Request('https://x/api/push/subscribe', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }), {}, env)
  const s = await realSub()
  assert.equal((await post({ ...s, endpoint: 'https://x.push.apple.com.evil.com/a' })).status, 400)
  assert.equal((await post('x'.repeat(5000))).status, 413)
  assert.equal((await post(s)).status, 200)
  assert.deepEqual(env.calls.put[0][2].metadata.sub, s)
})
