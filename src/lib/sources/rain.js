import { CloudRain, Droplets, MapPin, Clock } from 'lucide-react'
import { API_BASE } from '@/lib/config'

// Rainfall (CWA automatic rain stations). value = last-hour rainfall (mm).
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/rain`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'rain',
  category: 'weather',
  name: { zh: '雨量', en: 'Rainfall' },
  tagline: { zh: '全台雨量站即時時雨量', en: 'Live hourly rainfall across Taiwan' },
  accent: '#38bdf8',
  Icon: CloudRain,
  unit: 'mm',
  gauge: 'ring',
  views: ['map', 'grid'],
  refreshMs: 10 * 60 * 1000,

  tiers: [
    { lt: 1, key: 'none' },
    { lt: 10, key: 'light' },
    { lt: 30, key: 'moderate' },
    { lt: 80, key: 'heavy' },
    { key: 'extreme' },
  ],
  tierMeta: {
    none: { label: { zh: '無雨', en: 'None' }, color: '#64748b' },
    light: { label: { zh: '小雨', en: 'Light' }, color: '#38bdf8' },
    moderate: { label: { zh: '中雨', en: 'Moderate' }, color: '#3b82f6' },
    heavy: { label: { zh: '大雨', en: 'Heavy' }, color: '#f97316' },
    extreme: { label: { zh: '豪雨以上', en: 'Torrential' }, color: '#a855f7' },
  },

  formatValue: (v) => (v == null ? '--' : Number(v).toFixed(1)),
  metricLabel: { zh: '時雨量', en: 'Hourly rain' },

  searchFields: (it) => [it.name, it.group, it.meta?.town].filter(Boolean),
  sortOptions: [
    { key: 'value-desc', label: { zh: '時雨量 多→少', en: 'Rain ↓' } },
    { key: 'value-asc', label: { zh: '時雨量 少→多', en: 'Rain ↑' } },
    { key: 'name', label: { zh: '依測站', en: 'Station' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: CloudRain, label: { zh: '時雨量', en: 'Last hour' }, value: item.value != null ? `${Number(item.value).toFixed(1)} mm` : '--' },
    { icon: Droplets, label: { zh: '日累積', en: '24h total' }, value: item.meta?.day != null ? `${item.meta.day} mm` : '--' },
    { icon: MapPin, label: { zh: '位置', en: 'Location' }, value: item.group ?? '--' },
    { icon: Clock, label: { zh: '觀測時間', en: 'Observed' }, value: item.ts ? String(item.ts).replace('T', ' ') : '--' },
  ],
}
