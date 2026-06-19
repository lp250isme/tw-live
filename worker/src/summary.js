import { withEdgeCache } from './cache'
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

// Overview aggregator. The homepage needs a one-line headline per source, not
// the full lists (those total ~140 KB gzipped — wasteful just to show a
// number). This endpoint calls each list handler (warm via their own edge
// cache), reduces to a tiny numeric summary, and is itself edge-cached so the
// fan-out only happens on a cold summary cache.
//
// The reduction is intentionally GENERIC (count/sum/mean/min/max over the
// numeric `value`) — no tier/severity logic lives here. The frontend applies
// each source's tiers to the returned extremes, keeping tier definitions in a
// single place (the frontend source configs).
const LIST_HANDLERS = {
  water: handleWater,
  river: handleRiver,
  weather: handleWeather,
  rain: handleRain,
  air: handleAir,
  quake: handleQuake,
  uv: handleUV,
  youbike: handleYouBike,
  parking: handleParking,
  power: handlePower,
  oil: handleOil,
}

function reduce(items) {
  if (!Array.isArray(items)) return null
  let count = 0
  let sum = 0
  let min = null
  let max = null
  let latestTs = null
  for (const it of items) {
    const v = typeof it?.value === 'number' && Number.isFinite(it.value) ? it.value : null
    if (it?.ts && (latestTs == null || String(it.ts) > String(latestTs))) latestTs = it.ts
    if (v == null) continue
    count++
    sum += v
    if (min == null || v < min.value) min = { name: it.name, value: v }
    if (max == null || v > max.value) max = { name: it.name, value: v }
  }
  return {
    count,
    sum: count ? Number(sum.toFixed(3)) : 0,
    mean: count ? Number((sum / count).toFixed(3)) : null,
    min,
    max,
    latestTs,
  }
}

async function build(request, ctx, env) {
  const ids = Object.keys(LIST_HANDLERS)
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await LIST_HANDLERS[id](request, ctx, env)
        const items = await res.json()
        return [id, reduce(items)]
      } catch {
        return [id, null]
      }
    })
  )
  return Object.fromEntries(results)
}

export function handleSummary(request, ctx, env) {
  // 5 min: headline values don't need to be fresher than the lists they
  // summarize, and this keeps the 11-way fan-out rare.
  return withEdgeCache('summary', 300, () => build(request, ctx, env), ctx)
}
