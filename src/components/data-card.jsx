import { MapPin } from 'lucide-react'
import { cn, withAlpha } from '@/lib/utils'
import { getTier } from '@/lib/tier'
import { useLang } from '@/lib/i18n'
import { useSourceDetail } from '@/hooks/use-source-detail'
import MetricGauge from './metric-gauge'
import StatusBadge from './status-badge'

export default function DataCard({ source, item, onClick }) {
  const { t } = useLang()
  // hasDetail sources fetch per-card (deduped by query key); others carry value.
  const { data: detail, isLoading } = useSourceDetail(source, item, source.hasDetail)
  const eff = source.hasDetail ? detail : { value: item.value, ts: item.ts, raw: item.raw }
  const value = source.hasDetail ? (detail?.value ?? null) : item.value

  const tier = getTier(value, source.tiers)
  const meta = tier ? source.tierMeta?.[tier] : null
  const hasVal = value != null
  const glow = hasVal && meta ? withAlpha(meta.color, 0.18) : 'transparent'
  const border = hasVal && meta ? withAlpha(meta.color, 0.3) : 'rgba(148,163,184,0.1)'
  const footer = source.cardFooter ? t(source.cardFooter(item, eff)) : null
  const Icon = source.Icon

  return (
    <button
      onClick={() => onClick(item, eff)}
      className={cn(
        'group relative flex flex-col items-center gap-3 rounded-2xl p-5',
        'glass-card transition-all duration-300',
        'hover:-translate-y-1 hover:scale-[1.02] cursor-pointer text-left w-full'
      )}
      style={{ '--card-glow': glow, '--card-border': border }}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animated-card-border" />

      <div className="relative z-10 w-full">
        <div className="w-full flex items-start justify-between mb-1">
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors duration-300">
              {item.name}
            </h3>
            {item.group && (
              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="text-xs truncate">{item.group}</span>
              </div>
            )}
          </div>
          {hasVal && <StatusBadge source={source} value={value} />}
        </div>

        <div className="py-2 flex justify-center">
          {isLoading ? (
            <div className="w-[100px] h-[100px] rounded-full bg-muted/30 animate-pulse" />
          ) : hasVal ? (
            <MetricGauge source={source} value={value} size={100} />
          ) : (
            <div className="w-[100px] h-[100px] rounded-full bg-muted/30 flex items-center justify-center">
              {Icon && <Icon className="h-8 w-8 text-muted-foreground/50" />}
            </div>
          )}
        </div>

        {footer && (
          <div className="w-full text-[11px] text-muted-foreground/70 tabular-nums">{footer}</div>
        )}
      </div>
    </button>
  )
}
