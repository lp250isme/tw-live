import { handleOptions, json, withCors } from './cors'
import { handleWater } from './sources/water'
import { handleYouBike } from './sources/youbike'
import { handleAir } from './sources/air'
import { handleWeather } from './sources/weather'
import { handleParking } from './sources/parking'
import { handleRiver } from './sources/river'
import { handleQuake } from './sources/quake'
import { handleRain } from './sources/rain'
import { handleUV } from './sources/uv'
import { handlePower } from './sources/power'
import { handleOil } from './sources/oil'
import { handleSummary } from './summary'
import { handleTrack, handleTrackStats } from './track'
import { handlePushSubscribe, handlePushTest } from './push'
import { handleOilCron } from './oil-watch'

// tw-live-api — unified proxy/aggregator for Taiwan government open data.
// Holds upstream API keys (later sources), normalizes responses, adds CORS, and
// edge-caches via the Cache API. Each source is a small adapter under sources/.
const ROUTES = {
  '/api/water': handleWater,
  '/api/youbike': handleYouBike,
  '/api/air': handleAir,
  '/api/weather': handleWeather,
  '/api/parking': handleParking,
  '/api/river': handleRiver,
  '/api/quake': handleQuake,
  '/api/rain': handleRain,
  '/api/uv': handleUV,
  '/api/power': handlePower,
  '/api/oil': handleOil,
  '/api/summary': handleSummary,
  '/api/push/subscribe': handlePushSubscribe,
  '/api/push/test': handlePushTest,
  '/api/cron/oil-check': handleOilCron,
  '/api/track': handleTrack,
  '/api/track-stats': handleTrackStats,
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return handleOptions(request)

    // Per-IP rate limit (edge-local, no KV writes) — caps anyone hammering the
    // open proxy without touching normal browsing. Degrades open if unbound.
    if (env.API_RL) {
      const ip = request.headers.get('cf-connecting-ip') || 'anon'
      const { success } = await env.API_RL.limit({ key: ip })
      if (!success) return withCors(json({ error: 'rate limited' }, 429), request)
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (path === '/' || path === '/api') {
      return withCors(json({ ok: true, service: 'tw-live-api', sources: Object.keys(ROUTES).map((p) => p.replace('/api/', '')) }), request)
    }

    const handler = ROUTES[path]
    if (!handler) return withCors(json({ error: 'not found', path }, 404), request)

    try {
      return withCors(await handler(request, ctx, env), request)
    } catch (err) {
      return withCors(json({ error: String(err?.message || err) }, 502), request)
    }
  },
}
