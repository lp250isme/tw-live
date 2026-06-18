import { Droplets, Ruler, Clock, Database } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

// WRA (Water Resources Agency) open API. CORS-open, no key — fetched directly
// for now; will be routed through the Worker proxy in a later step.
const API = 'https://fhy.wra.gov.tw/WraApi'

async function fetchList() {
  const res = await fetch(`${API}/v1/Reservoir/Station?$filter=Importance eq 1`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return (Array.isArray(data) ? data : []).map((s) => ({
    id: String(s.StationNo),
    name: s.StationName,
    group: s.BasinName,
    lat: s.Latitude,
    lng: s.Longitude,
    value: null, // filled by fetchDetail
    ts: null,
    meta: { capacity: s.EffectiveCapacity },
    raw: s,
  }))
}

async function fetchDetail(item) {
  const res = await fetch(
    `${API}/v1/Reservoir/RealTimeInfo?$filter=StationNo eq '${item.id}'`
  )
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const d = (await res.json())?.[0] ?? null
  if (!d) return { value: null, ts: null, raw: null }
  return { value: d.PercentageOfStorage ?? null, ts: d.Time ?? null, raw: d }
}

async function fetchTrend(item) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 10)
  const fmt = (d) => d.toISOString().split('T')[0]
  const res = await fetch(
    `${API}/v1/Reservoir/RealTimeInfo?$filter=StationNo eq '${item.id}' and Time ge '${fmt(start)}' and Time le '${fmt(end)}'`
  )
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return data
    .filter((d) => d.PercentageOfStorage != null)
    .map((d) => ({
      x: new Date(d.Time).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
      y: Number(d.PercentageOfStorage.toFixed(1)),
    }))
    .slice(-20)
}

export default {
  id: 'water',
  category: 'environment',
  name: { zh: '水庫水位', en: 'Reservoirs' },
  tagline: { zh: '全台主要水庫即時蓄水率', en: 'Real-time storage of major reservoirs' },
  accent: '#0ea5e9',
  Icon: Droplets,
  unit: '%',
  gauge: 'fill',
  views: ['grid', 'map', 'chart'],
  refreshMs: 10 * 60 * 1000,

  // value (storage %) → tier. Low is bad.
  tiers: [
    { lt: 10, key: 'critical' },
    { lt: 20, key: 'warning' },
    { lt: 50, key: 'watch' },
    { key: 'normal' },
  ],
  tierMeta: {
    normal: { label: { zh: '水量正常', en: 'Normal' }, color: '#22c55e', gradient: ['#22c55e', '#16a34a', '#15803d'] },
    watch: { label: { zh: '水量偏低', en: 'Low' }, color: '#eab308', gradient: ['#eab308', '#ca8a04', '#a16207'] },
    warning: { label: { zh: '水量不足', en: 'Warning' }, color: '#f97316', gradient: ['#f97316', '#ea580c', '#c2410c'] },
    critical: { label: { zh: '嚴重不足', en: 'Critical' }, color: '#ef4444', gradient: ['#ef4444', '#dc2626', '#b91c1c'] },
  },

  formatValue: (v) => (v == null ? '--' : Number(v).toFixed(1)),
  metricLabel: { zh: '蓄水量', en: 'Storage' },

  searchFields: (it) => [it.name, it.group],
  sortOptions: [
    { key: 'name', label: { zh: '依名稱', en: 'Name' } },
    { key: 'value-asc', label: { zh: '蓄水量 低→高', en: 'Storage ↑' } },
    { key: 'value-desc', label: { zh: '蓄水量 高→低', en: 'Storage ↓' } },
    { key: 'group', label: { zh: '依流域', en: 'Basin' } },
  ],

  hasDetail: true,
  fetchList,
  fetchDetail,
  fetchTrend,

  detailFields: (item, detail) => [
    { icon: Droplets, label: { zh: '蓄水百分比', en: 'Storage %' }, value: detail?.value != null ? `${Number(detail.value).toFixed(1)}%` : '--' },
    { icon: Ruler, label: { zh: '水位高', en: 'Water level' }, value: detail?.raw?.WaterHeight != null ? `${formatNumber(detail.raw.WaterHeight)} 公尺` : '--' },
    { icon: Database, label: { zh: '有效蓄水量', en: 'Eff. storage' }, value: detail?.raw?.EffectiveStorage != null ? `${formatNumber(detail.raw.EffectiveStorage)} 萬m³` : '--' },
    { icon: Database, label: { zh: '有效容量', en: 'Capacity' }, value: item.meta?.capacity != null ? `${formatNumber(item.meta.capacity)} 萬m³` : '--' },
    { icon: Clock, label: { zh: '更新時間', en: 'Updated' }, value: detail?.ts ?? '--' },
  ],

  chart: {
    title: { zh: '蓄水量趨勢', en: 'Storage trend' },
    yLabel: { zh: '蓄水百分比', en: 'Storage %' },
    domain: [0, 100],
    unit: '%',
    color: '#0ea5e9',
  },

  cardFooter: (item) => ({
    zh: `有效容量 ${item.meta?.capacity != null ? item.meta.capacity.toLocaleString() : '--'} 萬m³`,
    en: `Cap. ${item.meta?.capacity != null ? item.meta.capacity.toLocaleString() : '--'} ×10⁴m³`,
  }),
}
