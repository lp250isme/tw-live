import { useMemo } from 'react'
import { withAlpha } from '@/lib/utils'
import { getTier } from '@/lib/tier'
import { useLang } from '@/lib/i18n'
import { useGyroscope } from '@/hooks/use-gyroscope'

// Two display modes, chosen by source.gauge:
//  'fill' — the signature liquid gauge (SVG fill that rises with a 0–100 value,
//           drifting waves/bubbles/sparkles + gyro-reactive glass shine).
//  else   — a 'ring': big number in a tier-coloured glowing ring, for count /
//           index metrics that aren't a percentage (e.g. bikes available).

function buildWavePath(waterY, amp, freq) {
  const points = []
  for (let x = 0; x <= 240; x += 4) {
    const y = waterY + Math.sin((x / 240) * Math.PI * freq) * amp
    points.push(`${x},${y.toFixed(2)}`)
  }
  return `M${points[0]} ${points.slice(1).map((p) => `L${p}`).join(' ')} V140 H0 Z`
}

function generateBubbles(count, seed) {
  const bubbles = []
  for (let i = 0; i < count; i++) {
    const r2 = Math.abs((Math.sin(seed + i * 269.5) * 13758.4321) % 1)
    const r3 = Math.abs((Math.sin(seed + i * 419.2) * 23421.631) % 1)
    const r = Math.abs((Math.sin(seed + i * 127.1) * 43758.5453) % 1)
    bubbles.push({ cx: 20 + r * 80, r: 1 + r2 * 2.5, delay: r3 * 4, duration: 3 + r2 * 3 })
  }
  return bubbles
}

function generateSparkles(count, seed) {
  const sparkles = []
  for (let i = 0; i < count; i++) {
    const r1 = Math.abs((Math.sin(seed + i * 311.7) * 43758.5453) % 1)
    const r2 = Math.abs((Math.sin(seed + i * 173.3) * 22578.1459) % 1)
    const r3 = Math.abs((Math.sin(seed + i * 541.9) * 33421.831) % 1)
    sparkles.push({ cx: 15 + r1 * 90, cy: 15 + r2 * 90, delay: r3 * 3, size: 0.8 + r1 * 1.2 })
  }
  return sparkles
}

function useGaugeMeta(source, value) {
  const tier = getTier(value, source.tiers)
  const meta = (tier && source.tierMeta?.[tier]) || {
    color: source.accent || '#0ea5e9',
    gradient: [source.accent || '#0ea5e9', source.accent || '#0ea5e9', source.accent || '#0ea5e9'],
    label: source.metricLabel,
  }
  return meta
}

function RingGauge({ source, value, size, meta, display, unit, label }) {
  const color = meta.color
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="absolute rounded-full gauge-pulse"
        style={{ width: size + 12, height: size + 12, top: -6, left: '50%', transform: 'translateX(-50%)', background: `radial-gradient(circle, ${color}22 0%, transparent 70%)` }}
      />
      <svg width={size} height={size} viewBox="0 0 120 120" className="relative z-10">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
        <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="3" strokeOpacity="0.9" style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
        <circle cx="60" cy="60" r="48" fill={withAlpha(color, 0.06)} />
        <text x="60" y="58" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold tabular-nums" fontSize="30" style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}>
          {display}
        </text>
        <text x="60" y="80" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize="11">
          {unit}
        </text>
      </svg>
      <span className="text-xs font-medium mt-1.5" style={{ color }}>{label}</span>
    </div>
  )
}

export default function MetricGauge({ source, value = 0, size = 120 }) {
  const { t } = useLang()
  const meta = useGaugeMeta(source, value)
  const unit = typeof source.unit === 'string' ? source.unit : t(source.unit)
  const display = source.formatValue ? source.formatValue(value) : String(value)
  const label = t(meta.label)

  const clampedPct = Math.max(0, Math.min(100, value ?? 0))
  const { x: tiltX, y: tiltY } = useGyroscope()
  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const bubbles = useMemo(() => generateBubbles(8, clampedPct), [clampedPct])
  const sparkles = useMemo(() => generateSparkles(5, clampedPct + 99), [clampedPct])

  if (source.gauge !== 'fill') {
    return <RingGauge source={source} value={value} size={size} meta={meta} display={display} unit={unit} label={label} />
  }

  const [color1, color2, color3] = meta.gradient
  const glowColor = meta.color
  const waterY = 114 - (clampedPct / 100) * 108
  const wave1 = buildWavePath(waterY, 3, 4)
  const wave2 = buildWavePath(waterY - 1, 2.2, 6)
  const wave3 = buildWavePath(waterY + 0.5, 1.5, 8)
  const shineX = 60 + tiltX * 30
  const shineY = 30 + tiltY * 20
  const flareX = 45 + tiltX * 25
  const flareY = 35 + tiltY * 15
  const rainbowAngle = Math.atan2(tiltY, tiltX) * (180 / Math.PI)

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="absolute rounded-full gauge-pulse"
        style={{ width: size + 12, height: size + 12, top: -6, left: '50%', transform: 'translateX(-50%)', background: `radial-gradient(circle, ${glowColor}22 0%, transparent 70%)`, boxShadow: `0 0 ${20 + clampedPct * 0.3}px ${glowColor}33, 0 0 ${40 + clampedPct * 0.5}px ${glowColor}11` }}
      />
      <svg width={size} height={size} viewBox="0 0 120 120" overflow="hidden" className="relative z-10">
        <defs>
          <clipPath id={`clip-${uid}`}><circle cx="60" cy="60" r="54" /></clipPath>
          <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color1} stopOpacity="0.6" />
            <stop offset="50%" stopColor={color2} stopOpacity="0.85" />
            <stop offset="100%" stopColor={color3} stopOpacity="1" />
          </linearGradient>
          <radialGradient id={`shine-${uid}`} cx={shineX / 120} cy={shineY / 120} r="0.6">
            <stop offset="0%" stopColor="white" stopOpacity="0.45" />
            <stop offset="30%" stopColor="white" stopOpacity="0.12" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`flare-${uid}`} cx={flareX / 120} cy={flareY / 120} r="0.25">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="40%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`rim-${uid}`} x1={0.3 + tiltX * 0.2} y1="0" x2={0.7 + tiltX * 0.2} y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="40%" stopColor="white" stopOpacity="0.05" />
            <stop offset="60%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="57" fill="none" stroke={glowColor} strokeWidth="0.5" strokeOpacity="0.3" />
        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
        <circle cx="60" cy="60" r="55" fill="none" stroke={`url(#rim-${uid})`} strokeWidth="2" />
        <g clipPath={`url(#clip-${uid})`}>
          <rect x="0" y={waterY} width="120" height={120 - waterY + 2} fill={`url(#grad-${uid})`} />
          <path className="wave-1" fill={color1} fillOpacity="0.3" d={wave1} />
          <path className="wave-2" fill={color2} fillOpacity="0.2" d={wave2} />
          <path className="wave-3" fill={color1} fillOpacity="0.15" d={wave3} />
          {bubbles.map((b, i) => (
            <circle key={i} cx={b.cx} cy="120" r={b.r} fill="white" fillOpacity="0.4" className="bubble"
              style={{ animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s`, '--bubble-start': '120px', '--bubble-end': `${waterY - 10}px` }} />
          ))}
        </g>
        <circle cx="60" cy="60" r="54" fill={`url(#shine-${uid})`} />
        <circle cx="60" cy="60" r="54" fill={`url(#flare-${uid})`} style={{ mixBlendMode: 'screen' }} />
        {sparkles.map((s, i) => (
          <g key={i} className="sparkle" style={{ animationDelay: `${s.delay}s` }}>
            <line x1={s.cx - s.size} y1={s.cy} x2={s.cx + s.size} y2={s.cy} stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />
            <line x1={s.cx} y1={s.cy - s.size} x2={s.cx} y2={s.cy + s.size} stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />
          </g>
        ))}
        <text x="60" y="54" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold tabular-nums" fontSize="24" style={{ filter: `drop-shadow(0 0 4px ${glowColor}66) drop-shadow(0 1px 2px rgba(0,0,0,0.3))` }}>
          {display}
        </text>
        <text x="60" y="74" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize="12">{unit}</text>
      </svg>
      <span className="text-xs font-medium mt-1.5" style={{ color: glowColor }}>{label}</span>
    </div>
  )
}
