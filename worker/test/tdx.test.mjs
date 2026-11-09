import test from 'node:test'
import assert from 'node:assert/strict'
import { tdxGet } from '../src/lib/tdx.js'

test('tdxGet still works when KV put/get throw (quota exhausted)', async () => {
  const store = new Map()
  globalThis.caches = { default: { match: async (k) => store.get(k.url)?.clone(), put: async (k, r) => void store.set(k.url, r), delete: async (k) => void store.delete(k.url) } }
  const orig = globalThis.fetch
  let auth = 0
  globalThis.fetch = async (u) => {
    if (String(u).includes('/token')) { auth++; return Response.json({ access_token: 'T', expires_in: 86400 }) }
    return Response.json({ ok: true })
  }
  const boom = async () => { throw new Error('KV put() limit exceeded for the day.') }
  const env = { TDX_CLIENT_ID: 'a', TDX_CLIENT_SECRET: 'b', TDX_KV: { get: boom, put: boom, delete: boom } }
  try {
    assert.deepEqual(await tdxGet(env, '/x'), { ok: true })
    assert.deepEqual(await tdxGet(env, '/y'), { ok: true })
    assert.equal(auth, 1) // second call served from memory
  } finally { globalThis.fetch = orig }
})
