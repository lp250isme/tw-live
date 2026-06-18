import { getTier } from '@/lib/tier'
import { useLang } from '@/lib/i18n'
import { withAlpha } from '@/lib/utils'

export default function StatusBadge({ source, value }) {
  const { t } = useLang()
  const tier = getTier(value, source.tiers)
  const meta = tier ? source.tierMeta?.[tier] : null
  if (!meta) return null

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color: meta.color, background: withAlpha(meta.color, 0.15) }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} aria-hidden />
      {t(meta.label)}
    </span>
  )
}
