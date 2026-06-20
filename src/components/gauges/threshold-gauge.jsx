import StatBlock from './stat-block'

// River level vs. flood-alert thresholds. Absolute metres mean nothing on
// their own — what matters is the level relative to the 三/二/一級警戒 lines
// (alert3 < alert2 < alert1, alert1 = most severe). Falls back to a plain stat
// for stations that publish no thresholds.
export default function ThresholdGauge(props) {
  const { source, value, item, display, unit, t } = props
  const a1 = item?.meta?.alert1, a2 = item?.meta?.alert2, a3 = item?.meta?.alert3

  if (a1 == null) return <StatBlock {...props} />

  const domainMax = a1 * 1.15
  const pct = (x) => Math.max(0, Math.min(1, x / domainMax)) * 100
  const level = value ?? 0

  let status
  if (level >= a1) status = { label: { zh: '一級警戒', en: 'Alert 1' }, color: '#ef4444' }
  else if (a2 != null && level >= a2) status = { label: { zh: '二級警戒', en: 'Alert 2' }, color: '#f97316' }
  else if (a3 != null && level >= a3) status = { label: { zh: '三級警戒', en: 'Alert 3' }, color: '#eab308' }
  else status = { label: { zh: '正常水位', en: 'Normal' }, color: source.accent || '#06b6d4' }

  const zones = [
    { from: 0, to: a3 ?? a2 ?? a1, color: source.accent || '#06b6d4' },
    a3 != null && { from: a3, to: a2 ?? a1, color: '#eab308' },
    a2 != null && { from: a2, to: a1, color: '#f97316' },
    { from: a1, to: domainMax, color: '#ef4444' },
  ].filter(Boolean)

  const marks = [
    a3 != null && { x: pct(a3), color: '#eab308', txt: t({ zh: '三', en: '3' }) },
    a2 != null && { x: pct(a2), color: '#f97316', txt: t({ zh: '二', en: '2' }) },
    a1 != null && { x: pct(a1), color: '#ef4444', txt: t({ zh: '一', en: '1' }) },
  ].filter(Boolean)

  const markPct = pct(level)

  return (
    <div className="flex w-full max-w-[300px] flex-col items-center gap-3 py-2">
      <div className="flex flex-col items-center leading-none">
        <div className="flex items-end gap-1">
          <span className="text-5xl font-bold tabular-nums tracking-tight">{display}</span>
          {unit && <span className="mb-1 text-sm font-medium text-muted-foreground">{unit}</span>}
        </div>
        <span className="mt-2 text-sm font-semibold" style={{ color: status.color }}>{t(status.label)}</span>
      </div>

      <div className="relative w-full pt-2.5">
        <div className="absolute top-0 -translate-x-1/2" style={{ left: `${markPct}%` }}>
          <div className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent" style={{ borderTopColor: status.color }} />
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full">
          {zones.map((z, i) => (
            <div key={i} style={{ width: `${((z.to - z.from) / domainMax) * 100}%`, background: z.color }} />
          ))}
        </div>
        <div className="absolute top-2.5 h-2.5 w-[2px] -translate-x-1/2 rounded-full bg-foreground" style={{ left: `${markPct}%` }} />
        <div className="relative mt-1.5 h-3.5 text-[10px] font-medium">
          {marks.map((mk, i) => (
            <span key={i} className="absolute -translate-x-1/2" style={{ left: `${mk.x}%`, color: mk.color }}>{mk.txt}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
