import { CloudSun, Thermometer, Droplet, Wind, CloudRain, MapPin, Clock } from 'lucide-react'
import { API_BASE } from '@/lib/config'

// Weather (air temperature) — ~850 CWA automatic stations. Pre-normalized by
// the Worker (/api/weather). Map + grid; value = temperature °C.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/weather`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'weather',
  category: 'weather',
  name: { zh: '天氣', en: 'Weather' },
  tagline: { zh: '全台氣象站即時氣溫', en: 'Live temperature across weather stations' },
  accent: '#f59e0b',
  Icon: CloudSun,
  unit: '°C',
  gauge: 'ring',
  views: ['map', 'grid'],
  refreshMs: 10 * 60 * 1000,

  tiers: [
    { lt: 12, key: 'cold' },
    { lt: 18, key: 'cool' },
    { lt: 26, key: 'mild' },
    { lt: 31, key: 'warm' },
    { key: 'hot' },
  ],
  tierMeta: {
    cold: { label: { zh: '寒冷', en: 'Cold' }, color: '#3b82f6' },
    cool: { label: { zh: '偏涼', en: 'Cool' }, color: '#22d3ee' },
    mild: { label: { zh: '舒適', en: 'Mild' }, color: '#22c55e' },
    warm: { label: { zh: '偏熱', en: 'Warm' }, color: '#f97316' },
    hot: { label: { zh: '炎熱', en: 'Hot' }, color: '#ef4444' },
  },

  formatValue: (v) => (v == null ? '--' : Number(v).toFixed(1)),
  metricLabel: { zh: '氣溫', en: 'Temp' },

  searchFields: (it) => [it.name, it.group, it.meta?.town].filter(Boolean),
  sortOptions: [
    { key: 'value-desc', label: { zh: '氣溫 高→低', en: 'Temp ↓' } },
    { key: 'value-asc', label: { zh: '氣溫 低→高', en: 'Temp ↑' } },
    { key: 'name', label: { zh: '依測站', en: 'Station' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: Thermometer, label: { zh: '氣溫', en: 'Temperature' }, value: item.value != null ? `${Number(item.value).toFixed(1)}°C` : '--' },
    { icon: CloudSun, label: { zh: '天氣', en: 'Weather' }, value: item.meta?.weather || '--' },
    { icon: Droplet, label: { zh: '相對濕度', en: 'Humidity' }, value: item.meta?.humidity != null ? `${item.meta.humidity}%` : '--' },
    { icon: Wind, label: { zh: '風速', en: 'Wind' }, value: item.meta?.wind != null ? `${item.meta.wind} m/s` : '--' },
    { icon: CloudRain, label: { zh: '時雨量', en: 'Rain (hr)' }, value: item.meta?.precip != null ? `${item.meta.precip} mm` : '--' },
    { icon: MapPin, label: { zh: '位置', en: 'Location' }, value: item.group ?? '--' },
    { icon: Clock, label: { zh: '觀測時間', en: 'Observed' }, value: item.ts ? String(item.ts).replace('T', ' ') : '--' },
  ],
}
