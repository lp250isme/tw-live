// Proportional radial gauge — for sources where value/max is genuinely "how
// full" (water %, bike availability, parking spaces, power reserve). The arc
// length encodes the ratio; count ratios show "n / total" in the centre.
const R = 52
const C = 2 * Math.PI * R

export default function RadialGauge({ source, value, item, color, label, display, unit, size = 160 }) {
  const isFill = source.gauge === 'fill'
  const max = source.gaugeMax ? source.gaugeMax(item) : source.max
  const m = max ?? (isFill ? 100 : null)
  const ratio = m && m > 0 ? Math.max(0, Math.min(1, (value ?? 0) / m)) : null
  const dash = ratio != null ? ratio * C : C

  // Count ratios (bikes / parking) read better as "12 / 30"; % sources keep %.
  const total = source.gaugeMax ? source.gaugeMax(item) : null
  const isCount = total != null && unit !== '%'
  const sub = isCount ? `/ ${total}` : unit
  const pct = ratio != null ? Math.round(ratio * 100) : null

  // Keep the readout clear of the ring — scale down as the number gets longer.
  const len = String(display).length
  const numSize = len >= 6 ? 26 : len === 5 ? 30 : len === 4 ? 34 : len === 3 ? 40 : 46

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
          x="60" y={sub ? 55 : 62}
          textAnchor="middle" dominantBaseline="middle"
          className="fill-foreground tabular-nums"
          fontSize={numSize} fontWeight="700" style={{ letterSpacing: '-0.03em' }}
        >
          {display}
        </text>
        {sub && (
          <text x="60" y="80" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground font-medium" fontSize="11">
            {sub}
          </text>
        )}
      </svg>
      <span className="mt-1 text-xs font-medium" style={{ color }}>
        {label}{isFill && pct != null ? ` · ${pct}%` : ''}
      </span>
    </div>
  )
}
