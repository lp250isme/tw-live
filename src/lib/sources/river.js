import { Droplet, Waves, MapPin, Clock } from 'lucide-react'
import { API_BASE } from '@/lib/config'
import { formatNumber } from '@/lib/utils'

// River water levels (WRA). value = current water level (m). No fixed tiers
// (alert thresholds vary per station) — shown in the detail panel instead.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/river`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'river',
  category: 'water',
  name: { zh: '河川水位', en: 'River Levels' },
  tagline: { zh: '全台河川測站即時水位', en: 'Live river water levels' },
  accent: '#06b6d4',
  Icon: Droplet,
  unit: 'm',
  gauge: 'ring',
  views: ['map', 'grid'],
  refreshMs: 10 * 60 * 1000,

  formatValue: (v) => (v == null ? '--' : Number(v).toFixed(2)),
  metricLabel: { zh: '水位', en: 'Level' },

  searchFields: (it) => [it.name, it.group].filter(Boolean),
  sortOptions: [
    { key: 'name', label: { zh: '依測站', en: 'Station' } },
    { key: 'value-desc', label: { zh: '水位 高→低', en: 'Level ↓' } },
    { key: 'value-asc', label: { zh: '水位 低→高', en: 'Level ↑' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: Droplet, label: { zh: '即時水位', en: 'Water level' }, value: item.value != null ? `${formatNumber(item.value)} m` : '--' },
    { icon: Waves, label: { zh: '河川', en: 'River' }, value: item.meta?.river ?? '--' },
    { icon: Waves, label: { zh: '三級警戒', en: 'Alert 3' }, value: item.meta?.alert3 != null ? `${item.meta.alert3} m` : '—' },
    { icon: Waves, label: { zh: '二級警戒', en: 'Alert 2' }, value: item.meta?.alert2 != null ? `${item.meta.alert2} m` : '—' },
    { icon: Waves, label: { zh: '一級警戒', en: 'Alert 1' }, value: item.meta?.alert1 != null ? `${item.meta.alert1} m` : '—' },
    { icon: Clock, label: { zh: '觀測時間', en: 'Observed' }, value: item.ts ? String(item.ts).replace('T', ' ') : '--' },
  ],
}
