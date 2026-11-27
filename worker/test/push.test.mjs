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
    endpoint: `https://${host}/fcm/send/tok-${n}-${'x'.repeat(24)}`, // real FCM shape
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

test('subscribe: refuses new subscriptions at the total cap, allows none-write refresh of existing', async () => {
  const { MAX_SUBS } = await import('../src/push.js')
  const entries = []
  for (let i = 0; i < MAX_SUBS; i++) entries.push({ name: `push:${i}`, value: '{}' })
  const env = await mkEnv(entries)
  const post = (b) => handlePushSubscribe(new Request('https://x/api/push/subscribe', { method: 'POST', body: JSON.stringify(b) }), {}, env)
  const s = await realSub()
  assert.equal((await post(s)).status, 503)
  assert.equal(env.calls.put.length, 0)
})

test('subscribe: re-subscribing a fresh existing endpoint does not write KV', async () => {
  const env = await mkEnv([])
  const post = (b) => handlePushSubscribe(new Request('https://x/api/push/subscribe', { method: 'POST', body: JSON.stringify(b) }), {}, env)
  const s = await realSub()
  assert.equal((await post(s)).status, 200)
  assert.equal(env.calls.put.length, 1)
  // mock get returns by name; simulate the stored entry being found
  const [name, value] = env.calls.put[0]
  const env2 = await mkEnv([{ name, value }])
  const r = await handlePushSubscribe(new Request('https://x/', { method: 'POST', body: JSON.stringify(s) }), {}, env2)
  assert.equal(r.status, 200)
  assert.equal(env2.calls.put.length, 0)
})

test('subscribe: new subscriptions need a real endpoint shape + RFC 8291 key sizes', async () => {
  const { isPlausibleNewSub } = await import('../src/push.js')
  const s = await realSub()
  const tok = 'A'.repeat(140)
  for (const endpoint of [
    `https://fcm.googleapis.com/fcm/send/${tok}`,
    `https://fcm.googleapis.com/wp/${tok}`,
    `https://web.push.apple.com/${tok}`,
    `https://updates.push.services.mozilla.com/wpush/v2/${tok}`,
    `https://wns2-par02p.notify.windows.com/w/?token=${tok}`,
  ]) assert.equal(isPlausibleNewSub({ ...s, endpoint }), true, endpoint)
  for (const endpoint of [
    'https://fcm.googleapis.com/x', // fake FCM path
    'https://fcm.googleapis.com/fcm/send/short',
    `https://fcm.googleapis.com/fcm/send/${tok}?a=1`,
    'https://web.push.apple.com/QX',
    `https://web.push.apple.com/${'A'.repeat(1100)}`, // too long
  ]) assert.equal(isPlausibleNewSub({ ...s, endpoint }), false, endpoint)
  assert.equal(isPlausibleNewSub({ ...s, keys: { ...s.keys, auth: 'AAAA' } }), false)
  assert.equal(isPlausibleNewSub({ ...s, keys: { ...s.keys, p256dh: s.keys.auth } }), false)
  assert.equal(isPlausibleNewSub({ ...s, keys: { ...s.keys, p256dh: '!!' } }), false)

  const env = await mkEnv([])
  const post = (b) => handlePushSubscribe(new Request('https://x/api/push/subscribe', { method: 'POST', body: JSON.stringify(b) }), {}, env)
  assert.equal((await post({ ...s, endpoint: 'https://fcm.googleapis.com/x' })).status, 400)
  assert.equal(env.calls.put.length, 0)
})

test('subscribe: PUSH_NEW_RL (key "all") blocks new writes with 429, throttled refresh is a silent no-op', async () => {
  const keys = []
  const deny = { async limit({ key }) { keys.push(key); return { success: false } } }
  const s = await realSub()
  const env = { ...(await mkEnv([])), PUSH_NEW_RL: deny }
  const r = await handlePushSubscribe(new Request('https://x/api/push/subscribe', { method: 'POST', body: JSON.stringify(s) }), {}, env)
  assert.equal(r.status, 429)
  assert.deepEqual(keys, ['all'])
  assert.equal(env.calls.put.length, 0)

  // stale existing entry (>7 days) would normally be refreshed; throttled → ok, no write
  const ok = await mkEnv([])
  await handlePushSubscribe(new Request('https://x/', { method: 'POST', body: JSON.stringify(s) }), {}, ok)
  const [name, value] = ok.calls.put[0]
  const stale = JSON.stringify({ ...JSON.parse(value), t: 0 })
  const env2 = { ...(await mkEnv([{ name, value: stale }])), PUSH_NEW_RL: deny }
  const r2 = await handlePushSubscribe(new Request('https://x/', { method: 'POST', body: JSON.stringify(s) }), {}, env2)
  assert.deepEqual([r2.status, await r2.json()], [200, { ok: true }])
  assert.equal(env2.calls.put.length, 0)
  env2.PUSH_NEW_RL = undefined
  await handlePushSubscribe(new Request('https://x/', { method: 'POST', body: JSON.stringify(s) }), {}, env2)
  assert.equal(env2.calls.put.length, 1) // unthrottled stale refresh still writes
})
