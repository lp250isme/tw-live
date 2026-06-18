// Generic tier resolver — replaces the hardcoded getWaterStatus().
// tiers: ordered array of { lt?, key }. Returns the first tier whose `lt`
// the value falls under; the last tier (no `lt`) is the catch-all.
// Works for "low is bad" (water %) and "high is bad" (AQI) by how the
// source orders its thresholds.
export function getTier(value, tiers) {
  if (value == null || !Array.isArray(tiers) || tiers.length === 0) return null
  for (const t of tiers) {
    if (t.lt == null) return t.key
    if (value < t.lt) return t.key
  }
  return tiers[tiers.length - 1].key
}
