import { Zap, Gauge, Power, Clock } from 'lucide-react'
import { API_BASE } from '@/lib/config'
import { formatNumber } from '@/lib/utils'

// National power reserve (Taipower). One card: the forecast peak operating
// reserve rate (備轉容量率), tiered by Taiwan's official thresholds.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/power`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'power',
  category: 'energy',
  name: { zh: '電力', en: 'Power' },
  tagline: { zh: '全國即時電力備轉容量', en: 'National power operating reserve' },
  accent: '#eab308',
  Icon: Zap,
  unit: '%',
  gauge: 'ring',
  detailGauge: 'radial',
  max: 20,
  views: ['grid'],
  refreshMs: 10 * 60 * 1000,

  worse: 'low',
  tiers: [
    { lt: 6, key: 'alert' },
    { lt: 10, key: 'tight' },
    { key: 'ok' },
  ],
  tierMeta: {
    alert: { label: { zh: '供電警戒', en: 'Alert' }, color: '#ef4444' },
    tight: { label: { zh: '供電吃緊', en: 'Tight' }, color: '#f97316' },
    ok: { label: { zh: '供電充裕', en: 'Ample' }, color: '#22c55e' },
  },

  formatValue: (v) => (v == null ? '--' : Number(v).toFixed(1)),
  metricLabel: { zh: '備轉容量率', en: 'Reserve' },

  searchFields: (it) => [it.name, it.group].filter(Boolean),
  sortOptions: [{ key: 'name', label: { zh: '名稱', en: 'Name' } }],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: Gauge, label: { zh: '備轉容量率', en: 'Reserve rate' }, value: item.value != null ? `${item.value}%` : '--' },
    { icon: Power, label: { zh: '目前負載', en: 'Current load' }, value: item.meta?.load != null ? `${formatNumber(item.meta.load)} 萬瓩` : '--' },
    { icon: Gauge, label: { zh: '用電率', en: 'Utilization' }, value: item.meta?.util != null ? `${item.meta.util}%` : '--' },
    { icon: Zap, label: { zh: '供電能力', en: 'Supply capacity' }, value: item.meta?.capacity != null ? `${formatNumber(item.meta.capacity)} 萬瓩` : '--' },
    { icon: Clock, label: { zh: '尖峰時段', en: 'Peak hours' }, value: item.meta?.peakHour ?? '--' },
    { icon: Clock, label: { zh: '發布時間', en: 'Published' }, value: item.ts ?? '--' },
  ],
}
