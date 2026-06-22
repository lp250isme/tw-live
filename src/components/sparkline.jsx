// Hand-rolled SVG sparkline (no chart lib — matches the project's hand-built
// gauges). data: [{ ts, v }] oldest→newest. Line coloured by overall trend
// (台灣慣例 漲紅跌綠).
export default function Sparkline({ data }) {
  if (!data || data.length < 2) return null
  const vals = data.map((d) => d.v)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const W = 320
  const H = 72
  const pad = 8
  const x = (i) => pad + (i / (data.length - 1)) * (W - 2 * pad)
  const y = (v) => pad + (1 - (v - min) / span) * (H - 2 * pad)
  const line = data.map((d, i) => `${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ')
  const area = `${pad},${H - pad} ${line} ${(W - pad).toFixed(1)},${H - pad}`
  const trend = vals[vals.length - 1] - vals[0]
  const color = trend > 0 ? 'var(--color-up)' : trend < 0 ? 'var(--color-down)' : 'var(--color-muted-foreground)'
  const last = data[data.length - 1]
  const md = (ts) => {
    const p = String(ts).split('-')
    return p.length === 3 ? `${+p[1]}/${+p[2]}` : ts
  }
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="價格走勢">
        <polygon points={area} fill={color} opacity="0.12" />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={x(data.length - 1).toFixed(1)} cy={y(last.v).toFixed(1)} r="3.5" fill={color} />
      </svg>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{md(data[0].ts)}</span>
        <span>高 {max} · 低 {min}</span>
        <span>{md(last.ts)} · {last.v}</span>
      </div>
    </div>
  )
}
