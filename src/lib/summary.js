import { getTier } from './tier'

// Aggregation helpers shared by the source-page summary bar (works off the full
// item list) and the overview tiles (works off the Worker's /api/summary
// numeric reduction). Tier/severity meaning lives entirely in the source
// configs — these functions just read `source.tiers` / `source.worse`.
//
// `source.worse` ('high' | 'low' | undefined) tells us which extreme is the
// notable one and which tier is the "all-clear" tier:
//   - 'high' (AQI, UV, quake, rain): big values are bad → safe tier = tiers[0]
//   - 'low'  (reservoir %, power reserve, bikes, parking): small values are bad
//            → safe tier = last tier
//   - undefined (weather is non-monotonic; river/oil have no tiers): no
//            severity, so no "alerts only" filter and the headline shows a range.

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export function fmtValue(source, v) {
  if (v == null) return '--'
  return source.formatValue ? source.formatValue(v) : String(v)
}

export function unitOf(source, t) {
  return typeof source.unit === 'string' ? source.unit : source.unit ? t(source.unit) : ''
}

// The tier that means "nothing to see here" for a monotonic source.
export function bestTierKey(source) {
  if (!source.tiers || !source.worse) return null
  return source.worse === 'low' ? source.tiers[source.tiers.length - 1].key : source.tiers[0].key
}

export function isAbnormal(source, item) {
  const best = bestTierKey(source)
  if (!best || !isNum(item?.value)) return false
  return getTier(item.value, source.tiers) !== best
}

// Whether the "alerts only" filter is meaningful for this source.
export function hasSeverity(source) {
  return !!(source.tiers && source.worse)
}

// Full client-side summary from the item list (source page).
export function summarize(source, items) {
  const valued = (items || []).filter((it) => isNum(it.value))
  const count = valued.length
  if (!count) return { count: 0 }
  let min = valued[0]
  let max = valued[0]
  let sum = 0
  const byTier = {}
  for (const it of valued) {
    sum += it.value
    if (it.value < min.value) min = it
    if (it.value > max.value) max = it
    if (source.tiers) {
      const k = getTier(it.value, source.tiers)
      if (k) byTier[k] = (byTier[k] || 0) + 1
    }
  }
  let dominant = null
  let topN = -1
  for (const [k, n] of Object.entries(byTier)) if (n > topN) ((topN = n), (dominant = k))
  const dominantMeta = dominant ? source.tierMeta?.[dominant] : null
  const extreme = source.worse === 'low' ? min : source.worse === 'high' ? max : null
  const abnormal = hasSeverity(source) ? valued.filter((it) => isAbnormal(source, it)).length : 0
  return { count, min, max, sum, mean: sum / count, byTier, dominant, dominantMeta, extreme, abnormal }
}

// Resolved one-line headline for an overview tile, from the Worker summary
// object ({ count, sum, mean, min:{name,value}, max:{name,value} }).
// Returns { count, valueText, statusLabel, color } or null.
export function overviewHeadline(source, s, t) {
  if (!s || !s.count) return null
  if (source.overview) {
    const o = source.overview(s, { t })
    return { count: s.count, statusLabel: null, color: source.accent, ...o }
  }
  const unit = unitOf(source, t)
  const ext = source.worse === 'low' ? s.min : source.worse === 'high' ? s.max : null
  if (ext) {
    const tier = getTier(ext.value, source.tiers)
    const meta = tier ? source.tierMeta?.[tier] : null
    return {
      count: s.count,
      valueText: `${ext.name} ${fmtValue(source, ext.value)}${unit}`,
      statusLabel: meta ? t(meta.label) : null,
      color: meta?.color || source.accent,
    }
  }
  // No severity direction: show the spread (weather temps, river levels, prices).
  return {
    count: s.count,
    valueText: `${fmtValue(source, s.min.value)}–${fmtValue(source, s.max.value)}${unit}`,
    statusLabel: null,
    color: source.accent,
  }
}
