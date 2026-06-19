import { useLang } from '@/lib/i18n'
import { withAlpha } from '@/lib/utils'
import { summarize, fmtValue, unitOf } from '@/lib/summary'

// One-line "national picture" above the list: count, dominant status, the
// notable extreme (or range for non-severity sources), and an alert count.
// Summarizes the FULL dataset (not the filtered view) so it always answers
// "how is it overall" regardless of search.
export default function SummaryBar({ source, items, shown }) {
  const { t } = useLang()
  const s = summarize(source, items)
  if (!s.count) return null

  const unit = unitOf(source, t)
  const extremeLabel = source.worse === 'low' ? t({ zh: '最低', en: 'Low' }) : t({ zh: '最高', en: 'High' })
  const filtered = shown != null && shown !== s.count

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      <span className="flex items-center gap-2 text-primary/70 tracking-wider uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        {s.count} {t({ zh: '筆', en: 'items' })}
      </span>

      {s.dominantMeta && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
          style={{ color: s.dominantMeta.color, background: withAlpha(s.dominantMeta.color, 0.15) }}
        >
          {t({ zh: '多數', en: 'mostly' })} {t(s.dominantMeta.label)}
        </span>
      )}

      {s.extreme ? (
        <span className="text-muted-foreground">
          {extremeLabel} <span className="text-foreground/90">{s.extreme.name}</span>{' '}
          <span className="font-semibold tabular-nums text-foreground">{fmtValue(source, s.extreme.value)}{unit}</span>
        </span>
      ) : (
        s.min && s.max && (
          <span className="text-muted-foreground tabular-nums">
            {fmtValue(source, s.min.value)}–{fmtValue(source, s.max.value)}{unit}
          </span>
        )
      )}

      {s.abnormal > 0 && (
        <span className="font-medium" style={{ color: 'var(--color-red, #ef4444)' }}>
          {s.abnormal} {t({ zh: '需注意', en: 'to watch' })}
        </span>
      )}

      {filtered && (
        <span className="text-muted-foreground/60 tracking-wider uppercase">
          {t({ zh: '顯示', en: 'showing' })} {shown}
        </span>
      )}
    </div>
  )
}
