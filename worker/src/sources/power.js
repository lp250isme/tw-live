import { withEdgeCache } from '../cache'

// Taipower national power reserve (loadpara.json). One national metric: the
// forecast peak operating-reserve rate (備轉容量率), with load/capacity detail.
const URL = 'https://www.taipower.com.tw/d006/loadGraph/loadGraph/data/loadpara.json'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json',
}
const num = (v) => {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

async function build() {
  let r = await fetch(URL, { headers: HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) r = await fetch(URL, { headers: HEADERS, cf: { cacheTtl: 0 } })
  if (!r.ok) throw new Error(`Taipower ${r.status}`)
  const j = await r.json()
  const m = Object.assign({}, ...(Array.isArray(j.records) ? j.records : []))
  return [
    {
      id: 'national',
      name: '全國電力',
      group: '即時供電',
      lat: null,
      lng: null,
      value: num(m.fore_peak_resv_rate),
      ts: m.publish_time || m.real_hr_peak_time || null,
      meta: {
        load: num(m.curr_load),
        util: num(m.curr_util_rate),
        capacity: num(m.fore_maxi_sply_capacity),
        peakLoad: num(m.fore_peak_dema_load),
        peakHour: m.fore_peak_hour_range || null,
        indicator: m.fore_peak_resv_indicator || null,
      },
    },
  ]
}

export function handlePower(request, ctx, env) {
  return withEdgeCache('power', 10 * 60, build, ctx)
}
