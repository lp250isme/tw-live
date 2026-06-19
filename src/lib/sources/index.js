import water from './water'
import river from './river'
import weather from './weather'
import rain from './rain'
import air from './air'
import quake from './quake'
import uv from './uv'
import youbike from './youbike'
import parking from './parking'
import power from './power'
import oil from './oil'

// Source registry. Add new gov-data sources here; the whole hub (nav, overview
// tiles, dashboards) is driven off this list.
export const sources = [water, river, weather, rain, air, quake, uv, youbike, parking, power, oil]

export const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]))

export function getSource(id) {
  return sourceMap[id] ?? null
}

// Top-level categories for the overview. Sources reference these by `category`.
export const categories = [
  { id: 'water', label: { zh: '水情', en: 'Water' } },
  { id: 'weather', label: { zh: '氣象', en: 'Weather' } },
  { id: 'env', label: { zh: '環境', en: 'Environment' } },
  { id: 'hazard', label: { zh: '防災', en: 'Hazard' } },
  { id: 'mobility', label: { zh: '交通', en: 'Mobility' } },
  { id: 'energy', label: { zh: '能源', en: 'Energy' } },
  { id: 'life', label: { zh: '生活', en: 'Life' } },
]
