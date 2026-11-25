import test from 'node:test'
import assert from 'node:assert/strict'
import { isBrowserRequest, turnstileGate, turnstileTokenFrom } from '../src/turnstile.js'
import { handlePushSubscribe, handlePushTest } from '../src/push.js'
import { handleOptions } from '../src/cors.js'

const req = (headers = {}, url = 'https://live-api.kvcc.me/api/push/subscribe', body = '{}') => new Request(url, { method: 'POST', headers, body })
const verify = (body, log) => async (u) => { log?.push(String(u)); return new Response(JSON.stringify(body)) }
const env = { TURNSTILE_SECRET: 's' }

test('isBrowserRequest', () => {
  assert.equal(isBrowserRequest(req({ Origin: 'https://live.kvcc.me' })), true)
  assert.equal(isBrowserRequest(req({ 'Sec-Fetch-Site': 'same-site' })), true)
  assert.equal(isBrowserRequest(req({ 'Sec-Fetch-Site': 'cross-site' })), false)
  assert.equal(isBrowserRequest(req({ Origin: 'https://evilkvcc.me' })), false)
  assert.equal(isBrowserRequest(req({ Origin: 'chrome-extension://x' })), false)
  assert.equal(isBrowserRequest(req()), false)
})

test('turnstileTokenFrom: header > body > query', () => {
  assert.equal(turnstileTokenFrom(req({ 'cf-turnstile-response': 'H' }), 'B'), 'H')
  assert.equal(turnstileTokenFrom(req(), 'B'), 'B')
  assert.equal(turnstileTokenFrom(req({}, 'https://x/a?cf-turnstile-response=Q')), 'Q')
})

test('turnstileGate: no token / false / wrong host / true / no secret / non-browser / siteverify down', async () => {
  const b = req({ Origin: 'https://live.kvcc.me' })
  const calls = []
  const r = await turnstileGate(env, b, '', { fetchImpl: verify({ success: true }, calls) })
  assert.equal(r.status, 403)
  assert.deepEqual(await r.json(), { error: 'turnstile_failed', code: 'turnstile_failed' })
  assert.equal(calls.length, 0)
  assert.equal((await turnstileGate(env, b, 't', { fetchImpl: verify({ success: false }) })).status, 403)
  assert.equal((await turnstileGate(env, b, 't', { fetchImpl: verify({ success: true, hostname: 'evil.example' }) })).status, 403)
  assert.equal(await turnstileGate(env, b, 't', { fetchImpl: verify({ success: true, hostname: 'live.kvcc.me' }) }), null)
  assert.equal(await turnstileGate({}, b, '', { fetchImpl: verify({ success: false }, calls) }), null)
  assert.equal(await turnstileGate(env, req(), '', { fetchImpl: verify({ success: false }, calls) }), null)
  assert.equal(calls.length, 0)
  assert.equal(await turnstileGate(env, b, 't', { fetchImpl: async () => { throw new Error('down') } }), null)
})

test('push subscribe/test: browser without token -> 403 and no KV access; native (no Origin) unchanged', async () => {
  const kv = { get: async () => { throw new Error('KV touched') }, put: async () => { throw new Error('KV touched') }, list: async () => { throw new Error('KV touched') } }
  const E = { ...env, TDX_KV: kv }
  for (const h of [handlePushSubscribe, handlePushTest]) {
    const r = await h(req({ Origin: 'https://live.kvcc.me' }), {}, E)
    assert.equal(r.status, 403)
    assert.equal((await r.json()).code, 'turnstile_failed')
    // native: passes the gate, then hits normal validation (400 invalid subscription), not 403
    assert.equal((await h(req(), {}, E)).status, 400)
  }
})

test('CORS preflight allows cf-turnstile-response header (cross-origin live.kvcc.me -> live-api.kvcc.me)', () => {
  const r = handleOptions(new Request('https://live-api.kvcc.me/api/push/subscribe', { method: 'OPTIONS', headers: { Origin: 'https://live.kvcc.me' } }))
  assert.match(r.headers.get('Access-Control-Allow-Headers'), /cf-turnstile-response/)
})
