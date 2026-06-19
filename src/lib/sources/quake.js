import { Waves, Gauge, MapPin, Clock, FileText } from 'lucide-react'
import { API_BASE } from '@/lib/config'

// Recent significant earthquakes (CWA). Event-shaped: each item is one quake.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/quake`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'quake',
  category: 'hazard',
  name: { zh: '地震', en: 'Earthquakes' },
  tagline: { zh: '近期顯著有感地震', en: 'Recent significant earthquakes' },
  accent: '#f43f5e',
  Icon: Waves,
  unit: 'M',
  gauge: 'ring',
  views: ['map', 'grid'],
  refreshMs: 5 * 60 * 1000,

  tiers: [
    { lt: 4, key: 'minor' },
    { lt: 5, key: 'light' },
    { lt: 6, key: 'moderate' },
    { key: 'strong' },
  ],
  tierMeta: {
    minor: { label: { zh: '微震', en: 'Minor' }, color: '#22c55e' },
    light: { label: { zh: '輕度', en: 'Light' }, color: '#eab308' },
    moderate: { label: { zh: '中度', en: 'Moderate' }, color: '#f97316' },
    strong: { label: { zh: '強震', en: 'Strong' }, color: '#ef4444' },
  },

  formatValue: (v) => (v == null ? '--' : Number(v).toFixed(1)),
  metricLabel: { zh: '規模', en: 'Magnitude' },

  searchFields: (it) => [it.name, it.group].filter(Boolean),
  sortOptions: [
    { key: 'name', label: { zh: '依時間', en: 'Recent' } },
    { key: 'value-desc', label: { zh: '規模 大→小', en: 'Magnitude ↓' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: Gauge, label: { zh: '規模', en: 'Magnitude' }, value: item.value != null ? `M${Number(item.value).toFixed(1)}` : '--' },
    { icon: Waves, label: { zh: '深度', en: 'Depth' }, value: item.meta?.depth != null ? `${item.meta.depth} km` : '--' },
    { icon: MapPin, label: { zh: '位置', en: 'Location' }, value: item.name },
    { icon: Clock, label: { zh: '發生時間', en: 'Time' }, value: item.ts ? String(item.ts).slice(0, 19).replace('T', ' ') : '--' },
    { icon: FileText, label: { zh: '報告', en: 'Report' }, value: item.meta?.content || '--' },
  ],
}
