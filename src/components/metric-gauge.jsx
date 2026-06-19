import { getTier } from '@/lib/tier'
import { useLang } from '@/lib/i18n'

// Clean radial gauge (Linear aesthetic): a hairline track + a tier-coloured
// progress arc. For percentage metrics (gauge:'fill') the arc length tracks the
// value; for counts/index metrics it's a full framing ring. Big tabular number
// in the centre, unit below, tier label beneath.
const R = 52
const C = 2 * Math.PI * R

export default function MetricGauge({ source, value = 0, size = 120 }) {
  const { t } = useLang()
  const tier = getTier(value, source.tiers)
  const meta = (tier && source.tierMeta?.[tier]) || { color: source.accent || '#7c7dff', label: source.metricLabel }
  const color = meta.color
  const unit = typeof source.unit === 'string' ? source.unit : t(source.unit)
  const display = source.formatValue ? source.formatValue(value) : String(value ?? '--')
  const label = t(meta.label)

  const isFill = source.gauge === 'fill'
  const pct = Math.max(0, Math.min(100, value ?? 0))
  const dash = isFill ? (pct / 100) * C : C
  const fontSize = display.length > 4 ? 20 : display.length > 2 ? 26 : 30

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray .5s ease', opacity: isFill ? 1 : 0.9 }}
        />
        <text x="60" y={unit ? 56 : 62} textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-semibold tabular-nums" fontSize={fontSize}>
          {display}
        </text>
        {unit && (
          <text x="60" y="80" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize="11">
            {unit}
          </text>
        )}
      </svg>
      <span className="text-xs font-medium mt-1" style={{ color }}>{label}</span>
    </div>
  )
}
