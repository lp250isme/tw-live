import { Bike, RotateCcw, ParkingMeter, MapPin, Clock } from 'lucide-react'
import { API_BASE } from '@/lib/config'

// YouBike 2.0 (Taipei). Pre-normalized by the Worker (/api/youbike). Map-first
// because there are ~1,700 stations; value = bikes currently available to rent.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/youbike`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'youbike',
  category: 'mobility',
  name: { zh: 'YouBike', en: 'YouBike' },
  tagline: { zh: '台北 YouBike 2.0 即時可借車輛', en: 'Taipei YouBike 2.0 live availability' },
  accent: '#f5a623',
  Icon: Bike,
  unit: { zh: ' 輛', en: '' },
  gauge: 'ring',
  gaugeMax: (it) => it.meta?.total || 30,
  views: ['map'],
  refreshMs: 60 * 1000,

  tiers: [
    { lt: 1, key: 'empty' },
    { lt: 6, key: 'low' },
    { key: 'ok' },
  ],
  tierMeta: {
    empty: { label: { zh: '無車可借', en: 'Empty' }, color: '#ef4444' },
    low: { label: { zh: '車輛偏少', en: 'Low' }, color: '#f97316' },
    ok: { label: { zh: '車輛充足', en: 'Available' }, color: '#22c55e' },
  },

  formatValue: (v) => (v == null ? '--' : String(v)),
  metricLabel: { zh: '可借車輛', en: 'Bikes available' },

  searchFields: (it) => [it.name, it.group, it.meta?.addr].filter(Boolean),
  sortOptions: [
    { key: 'value-desc', label: { zh: '可借 多→少', en: 'Bikes ↓' } },
    { key: 'value-asc', label: { zh: '可借 少→多', en: 'Bikes ↑' } },
    { key: 'name', label: { zh: '依站名', en: 'Name' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: Bike, label: { zh: '可借車輛', en: 'Bikes to rent' }, value: item.value != null ? `${item.value}` : '--' },
    { icon: RotateCcw, label: { zh: '可還空位', en: 'Docks free' }, value: item.meta?.ret != null ? `${item.meta.ret}` : '--' },
    { icon: ParkingMeter, label: { zh: '總車柱', en: 'Total docks' }, value: item.meta?.total != null ? `${item.meta.total}` : '--' },
    { icon: MapPin, label: { zh: '地址', en: 'Address' }, value: item.meta?.addr ?? '--' },
    { icon: Clock, label: { zh: '更新時間', en: 'Updated' }, value: item.ts ?? '--' },
  ],
}
