import test from 'node:test'
import assert from 'node:assert/strict'
import { handleTrack, handleTrackStats, DAILY_CAP } from '../src/track.js'
import { handleOilCron, handleOilPredictCron } from '../src/oil-watch.js'

function fakeCaches() {
  const m = new Map()
  return { default: { async match(r) { const v = m.get(r.url); return v ? new Response(v) : undefined }, async put(r, res) { m.set(r.url, await res.text()) } } }
}
const env = () => { const puts = []; return { puts, TDX_KV: { async put(...a) { puts.push(a) } } } }
const req = () => new Request('https://x/api/track', { method: 'POST', body: JSON.stringify({ sources: ['water'] }) })

test('track: KV writes capped per day, excess is dropped but still 200', async () => {
  globalThis.caches = fakeCaches()
  const e = env()
  for (let i = 0; i < DAILY_CAP + 15; i++) assert.equal((await handleTrack(req(), {}, e)).status, 200)
  assert.equal(e.puts.length, DAILY_CAP)
  delete globalThis.caches
})

test('track-stats: fails closed without/with wrong key', async () => {
  const mk = (h) => new Request('https://x/api/track-stats', { headers: h })
  assert.equal((await handleTrackStats(mk({}), {}, {})).status, 403)
  assert.equal((await handleTrackStats(mk({ 'x-stats-key': 'a' }), {}, {})).status, 403)
  assert.equal((await handleTrackStats(mk({ 'x-stats-key': 'a' }), {}, { STATS_KEY: 'b' })).status, 403)
})

test('oil cron: fails closed when OIL_CRON_KEY unset', async () => {
  const r = new Request('https://x/api/cron/oil-check')
  assert.equal((await handleOilCron(r, {}, {})).status, 403)
  assert.equal((await handleOilPredictCron(r, {}, {})).status, 403)
})

const reqFrom = (country) => {
  const r = req()
  Object.defineProperty(r, 'cf', { value: { country } })
  return r
}

test('track: TRACK_ALL_RL (key "all") blocks the KV write, response unchanged', async () => {
  const e = env()
  const keys = []
  e.TRACK_ALL_RL = { async limit({ key }) { keys.push(key); return { success: false } } }
  const r = await handleTrack(reqFrom('TW'), {}, e)
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { ok: true, sampled: false })
  assert.equal(e.puts.length, 0)
  assert.deepEqual(keys, ['all'])
  e.TRACK_ALL_RL = { async limit() { return { success: true } } }
  await handleTrack(reqFrom('TW'), {}, e)
  assert.equal(e.puts.length, 1)
})

test('track: non-TW events get the smaller per-colo cap; TW keeps DAILY_CAP', async () => {
  const { FOREIGN_DAILY_CAP } = await import('../src/track.js')
  globalThis.caches = fakeCaches()
  const e = env()
  for (let i = 0; i < DAILY_CAP; i++) await handleTrack(reqFrom('DE'), {}, e)
  assert.equal(e.puts.length, FOREIGN_DAILY_CAP)
  for (let i = 0; i < DAILY_CAP + 5; i++) await handleTrack(reqFrom('TW'), {}, e)
  assert.equal(e.puts.length, FOREIGN_DAILY_CAP + DAILY_CAP)
  delete globalThis.caches
})
