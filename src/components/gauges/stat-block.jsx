import { withAlpha } from '@/lib/utils'

// Plain headline stat — for quantities with no meaningful scale or ceiling
// (fuel price). A big number carries it; the source icon gives it presence.
// Also the graceful fallback for threshold/scale sources missing their data.
export default function StatBlock({ source, display, unit, label, color }) {
  const Icon = source.Icon
  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {Icon && (
        <div
          className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border"
          style={{ borderColor: withAlpha(color, 0.3), background: withAlpha(color, 0.1) }}
        >
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <span className="text-5xl font-bold tabular-nums tracking-tight">{display}</span>
        {unit && <span className="mb-1.5 text-base font-medium text-muted-foreground">{unit}</span>}
      </div>
      {label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
    </div>
  )
}
