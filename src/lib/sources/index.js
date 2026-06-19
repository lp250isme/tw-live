import water from './water'
import air from './air'
import weather from './weather'
import youbike from './youbike'
import parking from './parking'

// Source registry. Add new gov-data sources here; the whole hub (nav, overview
// tiles, dashboards) is driven off this list.
export const sources = [water, air, weather, youbike, parking]

export const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]))

export function getSource(id) {
  return sourceMap[id] ?? null
}

// Top-level categories for grouping on the overview. Sources reference these
// by `category` id.
export const categories = [
  { id: 'environment', label: { zh: '環境', en: 'Environment' } },
  { id: 'mobility', label: { zh: '交通', en: 'Mobility' } },
  { id: 'energy', label: { zh: '能源', en: 'Energy' } },
  { id: 'life', label: { zh: '生活', en: 'Life' } },
]
