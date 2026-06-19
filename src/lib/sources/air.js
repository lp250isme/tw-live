import { Wind, Activity, Factory, MapPin, Clock } from 'lucide-react'
import { API_BASE } from '@/lib/config'

// Air quality (AQI) — 84 MOENV monitoring stations. Pre-normalized by the
// Worker (/api/air). Map + grid; value = AQI, coloured by the official bands.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/air`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'air',
  category: 'env',
  name: { zh: '空氣品質', en: 'Air Quality' },
  tagline: { zh: '全台測站即時 AQI 空氣品質指標', en: 'Live AQI across Taiwan monitoring stations' },
  accent: '#34d399',
  Icon: Wind,
  unit: ' AQI',
  gauge: 'ring',
  max: 200,
  views: ['map', 'grid'],
  refreshMs: 30 * 60 * 1000,

  // higher AQI = worse; official Taiwan bands
  worse: 'high',
  tiers: [
    { lt: 51, key: 'good' },
    { lt: 101, key: 'moderate' },
    { lt: 151, key: 'sensitive' },
    { lt: 201, key: 'unhealthy' },
    { lt: 301, key: 'veryUnhealthy' },
    { key: 'hazardous' },
  ],
  tierMeta: {
    good: { label: { zh: '良好', en: 'Good' }, color: '#22c55e' },
    moderate: { label: { zh: '普通', en: 'Moderate' }, color: '#eab308' },
    sensitive: { label: { zh: '敏感族群不健康', en: 'Unhealthy (Sensitive)' }, color: '#f97316' },
    unhealthy: { label: { zh: '不健康', en: 'Unhealthy' }, color: '#ef4444' },
    veryUnhealthy: { label: { zh: '非常不健康', en: 'Very Unhealthy' }, color: '#a855f7' },
    hazardous: { label: { zh: '危害', en: 'Hazardous' }, color: '#9f1239' },
  },

  formatValue: (v) => (v == null ? '--' : String(Math.round(v))),
  metricLabel: { zh: '空氣品質', en: 'AQI' },

  searchFields: (it) => [it.name, it.group].filter(Boolean),
  sortOptions: [
    { key: 'value-desc', label: { zh: 'AQI 高→低', en: 'AQI ↓' } },
    { key: 'value-asc', label: { zh: 'AQI 低→高', en: 'AQI ↑' } },
    { key: 'name', label: { zh: '依測站', en: 'Station' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: Activity, label: { zh: 'AQI', en: 'AQI' }, value: item.value != null ? `${Math.round(item.value)}` : '--' },
    { icon: Factory, label: { zh: '主要污染物', en: 'Pollutant' }, value: item.meta?.pollutant || (item.meta?.status ?? '--') },
    { icon: Wind, label: { zh: 'PM2.5', en: 'PM2.5' }, value: item.meta?.pm25 != null ? `${item.meta.pm25} µg/m³` : '--' },
    { icon: Wind, label: { zh: 'PM10', en: 'PM10' }, value: item.meta?.pm10 != null ? `${item.meta.pm10} µg/m³` : '--' },
    { icon: MapPin, label: { zh: '縣市', en: 'County' }, value: item.group ?? '--' },
    { icon: Clock, label: { zh: '發布時間', en: 'Published' }, value: item.ts ?? '--' },
  ],
}
