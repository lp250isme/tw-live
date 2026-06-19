import { SquareParking, Car, MapPin, Clock } from 'lucide-react'
import { API_BASE } from '@/lib/config'

// Off-street parking availability (Taipei + New Taipei) via TDX. Pre-normalized
// by the Worker (/api/parking). Map + grid; value = available spaces.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/parking`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'parking',
  category: 'mobility',
  name: { zh: '停車場', en: 'Parking' },
  tagline: { zh: '雙北停車場即時剩餘車位', en: 'Live parking availability (Taipei metro)' },
  accent: '#c084fc',
  Icon: SquareParking,
  unit: { zh: ' 位', en: '' },
  gauge: 'ring',
  views: ['map', 'grid'],
  refreshMs: 60 * 1000,

  tiers: [
    { lt: 1, key: 'full' },
    { lt: 20, key: 'low' },
    { key: 'available' },
  ],
  tierMeta: {
    full: { label: { zh: '已滿', en: 'Full' }, color: '#ef4444' },
    low: { label: { zh: '剩少', en: 'Few' }, color: '#f97316' },
    available: { label: { zh: '有空位', en: 'Available' }, color: '#22c55e' },
  },

  formatValue: (v) => (v == null ? '--' : String(v)),
  metricLabel: { zh: '剩餘車位', en: 'Spaces' },

  searchFields: (it) => [it.name, it.group, it.meta?.address].filter(Boolean),
  sortOptions: [
    { key: 'value-desc', label: { zh: '空位 多→少', en: 'Spaces ↓' } },
    { key: 'value-asc', label: { zh: '空位 少→多', en: 'Spaces ↑' } },
    { key: 'name', label: { zh: '依名稱', en: 'Name' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: Car, label: { zh: '剩餘車位', en: 'Available' }, value: item.value != null ? `${item.value}` : '--' },
    { icon: SquareParking, label: { zh: '總車位', en: 'Total' }, value: item.meta?.total != null ? `${item.meta.total}` : '--' },
    { icon: MapPin, label: { zh: '地址', en: 'Address' }, value: item.meta?.address || item.group || '--' },
    { icon: Clock, label: { zh: '更新時間', en: 'Updated' }, value: item.ts ? String(item.ts).replace('T', ' ') : '--' },
  ],
}
