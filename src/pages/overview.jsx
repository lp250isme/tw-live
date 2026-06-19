import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { sources, categories } from '@/lib/sources'
import { useLang } from '@/lib/i18n'
import { withAlpha } from '@/lib/utils'

function SourceTile({ source }) {
  const { t } = useLang()
  const Icon = source.Icon
  return (
    <Link
      to={`/${source.id}`}
      className="group relative flex flex-col gap-3 rounded-xl p-5 glass-card transition-all duration-200 hover:-translate-y-0.5"
      style={{ '--card-glow': withAlpha(source.accent, 0.18), '--card-border': withAlpha(source.accent, 0.3) }}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animated-card-border" />
      <div className="relative z-10 flex items-start justify-between">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={{ background: withAlpha(source.accent, 0.12), border: `1px solid ${withAlpha(source.accent, 0.3)}`, color: source.accent }}
        >
          {Icon && <Icon className="h-6 w-6" />}
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
      <div className="relative z-10">
        <h3 className="font-semibold text-base">{t(source.name)}</h3>
        <p className="text-xs text-muted-foreground/70 mt-1">{t(source.tagline)}</p>
      </div>
    </Link>
  )
}

export default function Overview() {
  const { t } = useLang()
  return (
    <div className="space-y-8">
      <section className="text-center py-8 sm:py-12">
        <div className="inline-flex items-center gap-2 text-xs tracking-wider uppercase text-primary/70 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {t({ zh: '即時 · 政府開放資料', en: 'Live · Government Open Data' })}
        </div>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {t({ zh: '台灣即時資料戰情室', en: 'Taiwan Live Data Console' })}
        </h2>
        <p className="text-sm text-muted-foreground/70 mt-3 max-w-md mx-auto">
          {t({ zh: '一站匯集台灣政府公開的即時資料：水情、空品、天氣、交通、能源……', en: 'One place for Taiwan’s real-time open data — water, air, weather, transit, energy…' })}
        </p>
      </section>

      {categories.map((cat) => {
        const inCat = sources.filter((s) => s.category === cat.id)
        if (inCat.length === 0) return null
        return (
          <section key={cat.id}>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60 mb-3">{t(cat.label)}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inCat.map((s) => (
                <SourceTile key={s.id} source={s} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
