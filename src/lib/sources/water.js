import { Droplets, Database, Ruler, Clock, MapPin } from 'lucide-react'
import { API_BASE } from '@/lib/config'
import { formatNumber } from '@/lib/utils'

// Reservoir storage. Data comes pre-normalized from the tw-live Worker
// (/api/water), which merges WRA's realtime + basic datasets, computes the
// storage %, and attaches coordinates. So the frontend just fetches & renders.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/water`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'water',
  category: 'water',
  name: { zh: '水庫水位', en: 'Reservoirs' },
  tagline: { zh: '全台主要水庫即時蓄水率', en: 'Real-time storage of major reservoirs' },
  accent: '#0ea5e9',
  Icon: Droplets,
  unit: '%',
  gauge: 'fill',
  detailGauge: 'radial',
  views: ['grid', 'map'],
  refreshMs: 30 * 60 * 1000,

  worse: 'low',
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

  searchFields: (it) => [it.name, it.group, it.meta?.town, it.meta?.river].filter(Boolean),
  sortOptions: [
    { key: 'name', label: { zh: '依名稱', en: 'Name' } },
    { key: 'value-desc', label: { zh: '蓄水量 高→低', en: 'Storage ↓' } },
    { key: 'value-asc', label: { zh: '蓄水量 低→高', en: 'Storage ↑' } },
    { key: 'group', label: { zh: '依地區', en: 'Region' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: Droplets, label: { zh: '蓄水百分比', en: 'Storage %' }, value: item.value != null ? `${item.value}%` : '--' },
    { icon: Database, label: { zh: '有效蓄水量', en: 'Storage' }, value: item.meta?.current != null ? `${formatNumber(item.meta.current)} 萬m³` : '--' },
    { icon: Database, label: { zh: '有效容量', en: 'Capacity' }, value: item.meta?.capacity != null ? `${formatNumber(item.meta.capacity)} 萬m³` : '--' },
    { icon: Ruler, label: { zh: '水位', en: 'Water level' }, value: item.meta?.waterlevel != null ? `${formatNumber(item.meta.waterlevel)} m` : '--' },
    { icon: MapPin, label: { zh: '位置', en: 'Location' }, value: item.meta?.town ?? item.group ?? '--' },
    { icon: Clock, label: { zh: '更新時間', en: 'Updated' }, value: item.ts ? String(item.ts).replace('T', ' ') : '--' },
  ],
}
