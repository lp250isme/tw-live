import { getTier } from '@/lib/tier'
import { useLang } from '@/lib/i18n'

// Radial gauge: a hairline track + a tier-coloured arc whose length is
// proportional to value / max (so the ring actually conveys "how much" for
// every source, not just percentages). A bold tabular number sits in the
// centre, unit below, tier label beneath. When no max is known the ring is a
// full framing circle.
const R = 52
const C = 2 * Math.PI * R

export default function MetricGauge({ source, value = 0, size = 120, max = null }) {
  const { t } = useLang()
  const tier = getTier(value, source.tiers)
  const meta = (tier && source.tierMeta?.[tier]) || { color: source.accent || '#7c7dff', label: source.metricLabel }
  const color = meta.color
  const unit = typeof source.unit === 'string' ? source.unit : t(source.unit)
  const display = source.formatValue ? source.formatValue(value) : String(value ?? '--')
  const label = t(meta.label)

  const isFill = source.gauge === 'fill'
  const m = max ?? (isFill ? 100 : null)
  const ratio = m && m > 0 ? Math.max(0, Math.min(1, (value ?? 0) / m)) : null
  const dash = ratio != null ? ratio * C : C

  const big = size >= 140
  const len = display.length
  const numSize = len > 4 ? (big ? 30 : 22) : len > 2 ? (big ? 40 : 28) : big ? 48 : 32

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-border)" strokeWidth="7" />
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray .5s ease', opacity: ratio == null ? 0.85 : 1 }}
        />
        <text
          x="60" y={unit ? 55 : 62}
          textAnchor="middle" dominantBaseline="middle"
          className="fill-foreground tabular-nums"
          fontSize={numSize} fontWeight="700" style={{ letterSpacing: '-0.03em' }}
        >
          {display}
        </text>
        {unit && (
          <text x="60" y="80" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground font-medium" fontSize="11">
            {unit}
          </text>
        )}
      </svg>
      <span className="text-xs font-medium mt-1" style={{ color }}>{label}</span>
    </div>
  )
}
