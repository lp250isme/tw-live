// Banded severity scale — for standardised indices (UV, AQI, rainfall, quake
// magnitude). The point isn't "what fraction of max" but "which band am I in",
// so the official tier colours are drawn as proportional segments and a marker
// shows where the current value lands. `spectrum` draws a continuous gradient
// instead (temperature: cold → hot) where there are no discrete bands.
export default function ScaleBar({ source, value, color, label, display, unit, spectrum = false }) {
  const scaleMax = source.scaleMax || source.max || 100
  const tiers = source.tiers || []

  // Colour bands across [0, scaleMax] from the tier `lt` thresholds.
  const bands = []
  let prev = 0
  for (const tr of tiers) {
    const hi = tr.lt != null ? Math.min(tr.lt, scaleMax) : scaleMax
    if (hi > prev) bands.push({ lo: prev, hi, color: source.tierMeta?.[tr.key]?.color || source.accent })
    prev = tr.lt != null ? tr.lt : scaleMax
    if (prev >= scaleMax) break
  }

  const markPct = Math.max(0, Math.min(1, (value ?? 0) / scaleMax)) * 100
  const gradient = spectrum ? `linear-gradient(to right, ${bands.map((b) => b.color).join(', ')})` : null

  return (
    <div className="flex w-full max-w-[280px] flex-col items-center gap-3 py-2">
      <div className="flex flex-col items-center leading-none">
        <div className="flex items-end gap-1">
          <span className="text-5xl font-bold tabular-nums tracking-tight">{display}</span>
          {unit && <span className="mb-1 text-sm font-medium text-muted-foreground">{unit}</span>}
        </div>
        <span className="mt-2 text-sm font-semibold" style={{ color }}>{label}</span>
      </div>

      <div className="relative w-full pt-2.5">
        {/* tier-coloured pointer above the bar */}
        <div className="absolute top-0 -translate-x-1/2" style={{ left: `${markPct}%` }}>
          <div className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent" style={{ borderTopColor: color }} />
        </div>
        {/* the scale */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={spectrum ? { background: gradient } : undefined}>
          {!spectrum && bands.map((b, i) => (
            <div key={i} style={{ width: `${((b.hi - b.lo) / scaleMax) * 100}%`, background: b.color }} />
          ))}
        </div>
        {/* current-value needle */}
        <div className="absolute top-2.5 h-2.5 w-[2px] -translate-x-1/2 rounded-full bg-foreground" style={{ left: `${markPct}%` }} />
        <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>0</span>
          <span>{scaleMax}</span>
        </div>
      </div>
    </div>
  )
}
