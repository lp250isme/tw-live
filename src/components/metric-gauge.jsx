import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getTier } from '@/lib/tier'
import { useLang } from '@/lib/i18n'
import { useGyroscope } from '@/hooks/use-gyroscope'

// Signature "liquid" gauge: an SVG fill that rises with the value, with drifting
// waves, bubbles, sparkles and a gyroscope-reactive glass shine. Colours and the
// bottom label come from the source's tier config, so it works for any 0–100
// percentage-style metric (water storage, …). `unit` defaults to '%'.

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
    const r = (Math.sin(seed + i * 127.1) * 43758.5453) % 1
    const r2 = (Math.sin(seed + i * 269.5) * 13758.4321) % 1
    const r3 = (Math.sin(seed + i * 419.2) * 23421.631) % 1
    bubbles.push({ cx: 20 + Math.abs(r) * 80, r: 1 + Math.abs(r2) * 2.5, delay: Math.abs(r3) * 4, duration: 3 + Math.abs(r2) * 3 })
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

export default function MetricGauge({ source, value = 0, size = 120 }) {
  const { t } = useLang()
  const clampedPct = Math.max(0, Math.min(100, value ?? 0))
  const tier = getTier(value, source.tiers)
  const meta = (tier && source.tierMeta?.[tier]) || {
    color: source.accent || '#0ea5e9',
    gradient: [source.accent || '#0ea5e9', source.accent || '#0ea5e9', source.accent || '#0ea5e9'],
    label: source.metricLabel,
  }
  const [color1, color2, color3] = meta.gradient
  const glowColor = meta.color
  const unit = source.unit || '%'
  const display = source.formatValue ? source.formatValue(value) : String(clampedPct)

  const { x: tiltX, y: tiltY } = useGyroscope()
  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])

  const waterY = 114 - (clampedPct / 100) * 108
  const wave1 = buildWavePath(waterY, 3, 4)
  const wave2 = buildWavePath(waterY - 1, 2.2, 6)
  const wave3 = buildWavePath(waterY + 0.5, 1.5, 8)

  const bubbles = useMemo(() => generateBubbles(8, clampedPct), [clampedPct])
  const sparkles = useMemo(() => generateSparkles(5, clampedPct + 99), [clampedPct])

  const shineX = 60 + tiltX * 30
  const shineY = 30 + tiltY * 20
  const flareX = 45 + tiltX * 25
  const flareY = 35 + tiltY * 15
  const rainbowAngle = Math.atan2(tiltY, tiltX) * (180 / Math.PI)

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="absolute rounded-full gauge-pulse"
        style={{
          width: size + 12,
          height: size + 12,
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          background: `radial-gradient(circle, ${glowColor}22 0%, transparent 70%)`,
          boxShadow: `0 0 ${20 + clampedPct * 0.3}px ${glowColor}33, 0 0 ${40 + clampedPct * 0.5}px ${glowColor}11`,
        }}
      />

      <svg width={size} height={size} viewBox="0 0 120 120" overflow="hidden" className="relative z-10">
        <defs>
          <clipPath id={`clip-${uid}`}>
            <circle cx="60" cy="60" r="54" />
          </clipPath>
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
          <linearGradient id={`rainbow-${uid}`} gradientTransform={`rotate(${rainbowAngle}, 0.5, 0.5)`}>
            <stop offset="0%" stopColor="#ff0080" stopOpacity="0.12" />
            <stop offset="20%" stopColor="#ff8c00" stopOpacity="0.08" />
            <stop offset="40%" stopColor="#ffd700" stopOpacity="0.10" />
            <stop offset="60%" stopColor="#00ff88" stopOpacity="0.08" />
            <stop offset="80%" stopColor="#00bfff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.12" />
          </linearGradient>
          <radialGradient id={`flare-${uid}`} cx={flareX / 120} cy={flareY / 120} r="0.25">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="40%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id={`caustics-${uid}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="42" />
            <feDisplacementMap in="SourceGraphic" scale="6" />
          </filter>
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
          <rect x="0" y={waterY} width="120" height={Math.min(30, 120 - waterY)} fill={color1} fillOpacity="0.08" filter={`url(#caustics-${uid})`} className="caustics" />
          <path className="wave-1" fill={color1} fillOpacity="0.3" d={wave1} />
          <path className="wave-2" fill={color2} fillOpacity="0.2" d={wave2} />
          <path className="wave-3" fill={color1} fillOpacity="0.15" d={wave3} />
          {bubbles.map((b, i) => (
            <circle key={i} cx={b.cx} cy="120" r={b.r} fill="white" fillOpacity="0.4" className="bubble"
              style={{ animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s`, '--bubble-start': '120px', '--bubble-end': `${waterY - 10}px` }} />
          ))}
          <rect x="0" y={waterY} width="120" height={120 - waterY + 2} fill={`url(#rainbow-${uid})`} />
        </g>

        <circle cx="60" cy="60" r="54" fill={`url(#shine-${uid})`} />
        <circle cx="60" cy="60" r="54" fill={`url(#flare-${uid})`} style={{ mixBlendMode: 'screen' }} />

        {sparkles.map((s, i) => (
          <g key={i} className="sparkle" style={{ animationDelay: `${s.delay}s` }}>
            <line x1={s.cx - s.size} y1={s.cy} x2={s.cx + s.size} y2={s.cy} stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />
            <line x1={s.cx} y1={s.cy - s.size} x2={s.cx} y2={s.cy + s.size} stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />
            <line x1={s.cx - s.size * 0.6} y1={s.cy - s.size * 0.6} x2={s.cx + s.size * 0.6} y2={s.cy + s.size * 0.6} stroke="white" strokeWidth="0.3" strokeLinecap="round" opacity="0.5" />
            <line x1={s.cx + s.size * 0.6} y1={s.cy - s.size * 0.6} x2={s.cx - s.size * 0.6} y2={s.cy + s.size * 0.6} stroke="white" strokeWidth="0.3" strokeLinecap="round" opacity="0.5" />
          </g>
        ))}

        <text x="60" y="54" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold tabular-nums" fontSize="24"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor}66) drop-shadow(0 1px 2px rgba(0,0,0,0.3))` }}>
          {display}
        </text>
        <text x="60" y="74" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize="12">
          {unit}
        </text>
      </svg>

      <span className="text-xs font-medium mt-1.5" style={{ color: glowColor }}>
        {t(meta.label)}
      </span>
    </div>
  )
}
