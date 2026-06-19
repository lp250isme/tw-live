import { handleOptions, json } from './cors'
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
    if (request.method === 'OPTIONS') return handleOptions()

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (path === '/' || path === '/api') {
      return json({ ok: true, service: 'tw-live-api', sources: Object.keys(ROUTES).map((p) => p.replace('/api/', '')) })
    }

    const handler = ROUTES[path]
    if (!handler) return json({ error: 'not found', path }, 404)

    try {
      return await handler(request, ctx, env)
    } catch (err) {
      return json({ error: String(err?.message || err) }, 502)
    }
  },
}
