import { MapPin, ArrowUp, ArrowDown } from 'lucide-react'
import { cn, withAlpha } from '@/lib/utils'
import { getTier } from '@/lib/tier'
import { useLang } from '@/lib/i18n'
import { useGeo } from '@/lib/geo-context'
import { itemDistance, formatDistance } from '@/lib/geo'
import { fmtValue, unitOf } from '@/lib/summary'
import StatusBadge from './status-badge'

// Dense list row — replaces the full-viewport gauge card. One station per line
// so ~8-12 are visible at once (scan, compare, spot the outlier). The radial
// gauge now lives only in the detail dialog, where a single hero value belongs.
export default function DataRow({ source, item, onClick }) {
  const { t } = useLang()
  const { coords } = useGeo()
  const dist = itemDistance(coords, item)
  const value = item.value
  const hasVal = value != null

  const tier = getTier(value, source.tiers)
  const meta = tier ? source.tierMeta?.[tier] : null
  const color = meta?.color || source.accent || '#7c7dff'
  const unit = unitOf(source, t)

  // Proportional mini-bar, same ratio math as the gauge. Omitted when the
  // source has no max (e.g. river levels) — value + badge still carry the info.
  const max = source.gaugeMax ? source.gaugeMax(item) : source.max
  const m = max ?? (source.gauge === 'fill' ? 100 : null)
  const ratio = m && m > 0 && hasVal ? Math.max(0, Math.min(1, value / m)) : null

  return (
    <button
      onClick={() => onClick(item, { value, ts: item.ts, raw: item.raw })}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left',
        'border-border/60 bg-card/30 transition-colors duration-150',
        'hover:bg-card/70 hover:border-primary/30 cursor-pointer'
      )}
    >
      {/* tier dot (alignment anchor on the left) */}
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: hasVal ? color : 'var(--color-border)' }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium group-hover:text-primary transition-colors">{item.name}</div>
        {(item.group || dist != null) && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {item.group}
              {dist != null && <span className="text-primary/80">{item.group ? ' · ' : ''}{formatDistance(dist)}</span>}
            </span>
          </div>
        )}
      </div>

      {ratio != null && (
        <div className="hidden sm:block h-1.5 w-16 shrink-0 overflow-hidden rounded-full" style={{ background: withAlpha(color, 0.15) }}>
          <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: color, transition: 'width .4s ease' }} />
        </div>
      )}

      <div className="shrink-0 text-right tabular-nums">
        <div>
          <span className="text-base font-semibold">{fmtValue(source, value)}</span>
          {unit && <span className="ml-0.5 text-[11px] text-muted-foreground">{unit}</span>}
        </div>
        {/* Week-over-week move (oil prices carry delta/dir; other sources don't). */}
        {item.delta != null && item.dir !== 0 && (
          <div
            className="mt-0.5 flex items-center justify-end gap-0.5 text-[11px] font-medium"
            style={{ color: item.dir > 0 ? 'var(--color-up)' : 'var(--color-down)' }}
          >
            {item.dir > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            <span>{item.dir > 0 ? '+' : '−'}{Math.abs(item.delta).toFixed(1)}</span>
          </div>
        )}
      </div>

      {meta && <div className="shrink-0"><StatusBadge source={source} value={value} /></div>}
    </button>
  )
}
