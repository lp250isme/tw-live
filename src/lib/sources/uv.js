import { Sun, MapPin, Clock } from 'lucide-react'
import { API_BASE } from '@/lib/config'

// UV index (CWA daily max per station). value = UV index.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/uv`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'uv',
  category: 'weather',
  name: { zh: '紫外線', en: 'UV Index' },
  tagline: { zh: '各氣象站紫外線指數', en: 'UV index by station' },
  accent: '#a855f7',
  Icon: Sun,
  unit: '',
  gauge: 'ring',
  max: 11,
  views: ['map', 'grid'],
  refreshMs: 60 * 60 * 1000,

  worse: 'high',
  tiers: [
    { lt: 3, key: 'low' },
    { lt: 6, key: 'moderate' },
    { lt: 8, key: 'high' },
    { lt: 11, key: 'veryhigh' },
    { key: 'extreme' },
  ],
  tierMeta: {
    low: { label: { zh: '低量級', en: 'Low' }, color: '#22c55e' },
    moderate: { label: { zh: '中量級', en: 'Moderate' }, color: '#eab308' },
    high: { label: { zh: '高量級', en: 'High' }, color: '#f97316' },
    veryhigh: { label: { zh: '過量級', en: 'Very High' }, color: '#ef4444' },
    extreme: { label: { zh: '危險級', en: 'Extreme' }, color: '#a855f7' },
  },

  formatValue: (v) => (v == null ? '--' : String(Math.round(v))),
  metricLabel: { zh: 'UV 指數', en: 'UV Index' },

  searchFields: (it) => [it.name, it.group].filter(Boolean),
  sortOptions: [
    { key: 'value-desc', label: { zh: 'UV 高→低', en: 'UV ↓' } },
    { key: 'value-asc', label: { zh: 'UV 低→高', en: 'UV ↑' } },
    { key: 'name', label: { zh: '依測站', en: 'Station' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: Sun, label: { zh: 'UV 指數', en: 'UV Index' }, value: item.value != null ? String(Math.round(item.value)) : '--' },
    { icon: MapPin, label: { zh: '縣市', en: 'County' }, value: item.group ?? '--' },
    { icon: Clock, label: { zh: '日期', en: 'Date' }, value: item.ts ?? '--' },
  ],
}
