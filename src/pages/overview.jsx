import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Star } from 'lucide-react'
import { sources, categories } from '@/lib/sources'
import { useLang } from '@/lib/i18n'
import { withAlpha } from '@/lib/utils'
import { API_BASE } from '@/lib/config'
import { overviewHeadline } from '@/lib/summary'
import { useFavorites } from '@/lib/favorites'

// One lightweight request feeds every tile its live headline (the Worker
// pre-aggregates all sources to ~1 KB; fetching the full lists here would be
// ~140 KB). Tiles degrade to their tagline if a source's summary is missing.
function useSummary() {
  return useQuery({
    queryKey: ['summary'],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/summary`)
      if (!r.ok) throw new Error(`summary ${r.status}`)
      return r.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

function SourceTile({ source, summary, loading }) {
  const { t } = useLang()
  const { isFav, toggle } = useFavorites()
  const Icon = source.Icon
  const head = overviewHeadline(source, summary, t)
  const fav = isFav(source.id)

  const onStar = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggle(source.id)
  }

  return (
    <Link
      to={`/${source.id}`}
      className="group relative flex flex-col gap-3 rounded-xl p-5 glass-card transition-all duration-200 hover:-translate-y-0.5"
      style={{ '--card-glow': withAlpha(head?.color || source.accent, 0.18), '--card-border': withAlpha(head?.color || source.accent, 0.3) }}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animated-card-border" />
      <div className="relative z-10 flex items-start justify-between">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={{ background: withAlpha(source.accent, 0.12), border: `1px solid ${withAlpha(source.accent, 0.3)}`, color: source.accent }}
        >
          {Icon && <Icon className="h-6 w-6" />}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onStar}
            aria-label={fav ? t({ zh: '取消收藏', en: 'Unpin' }) : t({ zh: '加入最愛', en: 'Pin' })}
            aria-pressed={fav}
            className="rounded-full p-1.5 text-muted-foreground/40 hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Star className="h-4 w-4" style={fav ? { fill: '#f5b301', color: '#f5b301' } : undefined} />
          </button>
          <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="font-semibold text-base">{t(source.name)}</h3>
        {head ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs min-w-0">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: head.color }} aria-hidden />
            <span className="truncate font-medium text-foreground/90 tabular-nums">{head.valueText}</span>
            {head.statusLabel && (
              <span className="shrink-0" style={{ color: head.color }}>· {head.statusLabel}</span>
            )}
          </div>
        ) : loading ? (
          <div className="mt-2 h-3 w-24 rounded bg-muted/40 animate-pulse" />
        ) : (
          <p className="text-xs text-muted-foreground/70 mt-1">{t(source.tagline)}</p>
        )}
      </div>
    </Link>
  )
}

function TileGrid({ list, summary, loading }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {list.map((s) => (
        <SourceTile key={s.id} source={s} summary={summary?.[s.id]} loading={loading} />
      ))}
    </div>
  )
}

export default function Overview() {
  const { t } = useLang()
  const { data: summary, isLoading } = useSummary()
  const { favs, isFav } = useFavorites()

  // Pinned sources float to a "favourites" section at the top, in pin order,
  // and are removed from their category section below (no duplicates).
  const pinned = favs.map((id) => sources.find((s) => s.id === id)).filter(Boolean)

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

      {pinned.length > 0 && (
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-muted-foreground/60 mb-3">
            <Star className="h-3.5 w-3.5" style={{ fill: '#f5b301', color: '#f5b301' }} />
            {t({ zh: '我的最愛', en: 'Favourites' })}
          </h3>
          <TileGrid list={pinned} summary={summary} loading={isLoading} />
        </section>
      )}

      {categories.map((cat) => {
        const inCat = sources.filter((s) => s.category === cat.id && !isFav(s.id))
        if (inCat.length === 0) return null
        return (
          <section key={cat.id}>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60 mb-3">{t(cat.label)}</h3>
            <TileGrid list={inCat} summary={summary} loading={isLoading} />
          </section>
        )
      })}
    </div>
  )
}
