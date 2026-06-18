import { withEdgeCache } from '../cache'

// MOENV air-quality index (AQI), 84 monitoring stations with coordinates.
// data.moenv.gov.tw sits behind an F5 WAF like WRA; browser-like headers pass.
// The api_key below is MOENV's public/demo key published on data.gov.tw; set a
// private MOENV_KEY secret to override. Cached 1h (AQI updates hourly).
const PUBLIC_KEY = 'e75b1660-e564-4107-aad5-a8be1f905dd9'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'zh-TW,zh;q=0.9',
  Referer: 'https://data.moenv.gov.tw/',
}

function stripControlChars(text) {
  let out = ''
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) >= 32) out += text[i]
  return out
}

const num = (v) => {
  if (v == null) return null
  const n = parseFloat(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

async function build(env) {
  const key = (env && env.MOENV_KEY) || PUBLIC_KEY
  const url = `https://data.moenv.gov.tw/api/v2/aqx_p_432?api_key=${key}&limit=1000&format=JSON`
  const r = await fetch(url, { headers: HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) throw new Error(`MOENV upstream ${r.status}`)
  const data = JSON.parse(stripControlChars(await r.text()))
  const recs = Array.isArray(data) ? data : data.records || []
  return recs
    .map((s) => ({
      id: String(s.siteid ?? s.sitename),
      name: s.sitename,
      group: s.county,
      lat: num(s.latitude),
      lng: num(s.longitude),
      value: num(s.aqi),
      ts: s.publishtime ?? null,
      meta: {
        status: s.status || null,
        pollutant: s.pollutant || null,
        pm25: num(s['pm2.5']),
        pm10: num(s.pm10),
        o3: num(s.o3),
      },
    }))
    .filter((x) => x.name)
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
}

export function handleAir(request, ctx, env) {
  return withEdgeCache('air', 60 * 60, () => build(env), ctx)
}
