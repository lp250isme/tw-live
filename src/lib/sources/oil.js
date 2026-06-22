import { Fuel, DollarSign, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { API_BASE } from '@/lib/config'

// CPC (中油) reference retail fuel prices (NT$/L). Info tiles, no map.
async function fetchList() {
  const res = await fetch(`${API_BASE}/api/oil`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export default {
  id: 'oil',
  category: 'life',
  name: { zh: '油價', en: 'Fuel Prices' },
  tagline: { zh: '中油主要油品參考牌價', en: 'CPC reference fuel prices' },
  accent: '#84cc16',
  Icon: Fuel,
  unit: '元/L',
  gauge: 'ring',
  detailGauge: 'stat',
  max: 45,
  views: ['grid'],
  refreshMs: 60 * 60 * 1000,

  formatValue: (v) => (v == null ? '--' : Number(v).toFixed(1)),
  metricLabel: { zh: '參考牌價', en: 'Price' },

  searchFields: (it) => [it.name].filter(Boolean),
  sortOptions: [
    { key: 'value-desc', label: { zh: '價格 高→低', en: 'Price ↓' } },
    { key: 'name', label: { zh: '依油品', en: 'Product' } },
  ],

  hasDetail: false,
  fetchList,

  detailFields: (item) => [
    { icon: DollarSign, label: { zh: '參考牌價', en: 'Price' }, value: item.value != null ? `${item.value} 元/公升` : '--' },
    ...(item.delta != null
      ? [
          {
            icon: item.dir > 0 ? TrendingUp : item.dir < 0 ? TrendingDown : Minus,
            label: { zh: '較上週', en: 'vs last week' },
            value:
              item.dir === 0
                ? '持平' + (item.prev != null ? `（上週 ${item.prev}）` : '')
                : `${item.dir > 0 ? '▲ +' : '▼ −'}${Math.abs(item.delta).toFixed(1)} 元` + (item.prev != null ? `（上週 ${item.prev}）` : ''),
          },
        ]
      : []),
    { icon: Clock, label: { zh: '生效日期', en: 'Effective' }, value: item.ts ?? '--' },
  ],
}
