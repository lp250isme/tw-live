import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import { useParams, useSearchParams, Navigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { LayoutGrid, Map as MapIcon, TriangleAlert, Star } from 'lucide-react'
import { getSource } from '@/lib/sources'
import { useSourceList } from '@/hooks/use-source'
import { useLang } from '@/lib/i18n'
import { useGeo } from '@/lib/geo-context'
import { itemDistance } from '@/lib/geo'
import { trackOpen } from '@/lib/track'
import { cn, withAlpha } from '@/lib/utils'
import { hasSeverity, isAbnormal } from '@/lib/summary'
import { useFavorites } from '@/lib/favorites'
import SearchFilter from '@/components/search-filter'
import SummaryBar from '@/components/summary-bar'
import DataList from '@/components/data-list'
import LoadingSkeleton from '@/components/loading-skeleton'
import ErrorState from '@/components/error-state'

const MapView = lazy(() => import('@/components/map-view'))
// Deferred until the first card click — keeps radix-dialog out of the initial
// source-page bundle (the dialog is only ever shown on demand).
const DetailDialog = lazy(() => import('@/components/detail-dialog'))

export default function SourcePage() {
  const { sourceId } = useParams()
  const source = getSource(sourceId)
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useState({ open: false, item: null, detail: null })
  const [q, setQ] = useState(() => params.get('q') || '')

  const setParam = (key, val) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (val) next.set(key, val)
        else next.delete(key)
        return next
      },
      { replace: true }
    )

  const supported = source?.views ?? ['grid']
  const reqView = params.get('view')
  const view = reqView && supported.includes(reqView) ? reqView : supported.includes('grid') ? 'grid' : supported[0]
  const { coords } = useGeo()
  // when located, offer (and default to) a distance sort
  const sortOptions = coords
    ? [{ key: 'distance', label: { zh: '附近 近→遠', en: 'Nearest first' } }, ...(source?.sortOptions ?? [])]
    : source?.sortOptions ?? []
  const sortBy = params.get('sort') || (coords ? 'distance' : source?.sortOptions?.[0]?.key || 'name')
  const onlyAlert = params.get('only') === 'alert' && hasSeverity(source)
  const { isFav, toggle: toggleFav } = useFavorites()

  const { data: items, isLoading, error, refetch } = useSourceList(source ?? { id: '_none', fetchList: async () => [] })

  // Batch detail for map markers and for value-based sorting (deduped with
  // per-card queries by query key). Disabled otherwise.
  const wantDetail = !!source?.hasDetail && (view === 'map' || sortBy.startsWith('value'))
  const detailQueries = useQueries({
    queries: (source?.hasDetail ? items ?? [] : []).map((it) => ({
      queryKey: ['src-detail', source.id, it.id],
      queryFn: () => source.fetchDetail(it),
      staleTime: 5 * 60 * 1000,
      enabled: wantDetail,
    })),
  })

  const detailMap = useMemo(() => {
    const m = {}
    if (source?.hasDetail && items) {
      items.forEach((it, i) => {
        const d = detailQueries[i]?.data
        if (d) m[it.id] = d
      })
    }
    return m
  }, [items, detailQueries, source])

  const valueOf = (it) => (source?.hasDetail ? detailMap[it.id]?.value ?? null : it.value)

  const filtered = useMemo(() => {
    if (!items || !source) return []
    // fuzzy: case-insensitive AND-match of whitespace tokens across every
    // searchable field (name, area, address, river, …)
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    let result = tokens.length
      ? items.filter((it) => {
          const hay = source.searchFields(it).filter(Boolean).join(' ').toLowerCase()
          return tokens.every((tok) => hay.includes(tok))
        })
      : [...items]
    if (onlyAlert) result = result.filter((it) => isAbnormal(source, it))
    const cmp = {
      name: (a, b) => a.name.localeCompare(b.name, 'zh-TW'),
      group: (a, b) => (a.group || '').localeCompare(b.group || '', 'zh-TW'),
      'value-asc': (a, b) => (valueOf(a) ?? -1) - (valueOf(b) ?? -1),
      'value-desc': (a, b) => (valueOf(b) ?? -1) - (valueOf(a) ?? -1),
      distance: (a, b) => (itemDistance(coords, a) ?? Infinity) - (itemDistance(coords, b) ?? Infinity),
    }[sortBy]
    if (cmp) result.sort(cmp)
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q, sortBy, detailMap, source, coords, onlyAlert])

  // click intelligence: one "opened" event per source per session
  useEffect(() => {
    if (source?.id) trackOpen(source.id)
  }, [source?.id])

  // search box stays local (smooth, IME-safe typing); reset on source switch
  // (seed from URL deep link) and sync to the URL debounced for shareability.
  useEffect(() => { setQ(params.get('q') || '') }, [sourceId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const tmr = setTimeout(() => setParam('q', q), 350)
    return () => clearTimeout(tmr)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!source) return <Navigate to="/" replace />

  const onCardClick = (item, detail) => setDialog({ open: true, item, detail })

  if (error) return <ErrorState onRetry={refetch} />

  return (
    <div style={{ '--color-primary': source.accent }}>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchFilter
          source={source}
          sortOptions={sortOptions}
          search={q}
          onSearchChange={setQ}
          sortBy={sortBy}
          onSortChange={(v) => setParam('sort', v)}
        />
        {supported.length > 1 && (
          <div className="flex rounded-full border border-primary/20 p-0.5 neon-toggle self-start">
            {[
              { key: 'grid', Icon: LayoutGrid, label: { zh: '列表', en: 'Grid' } },
              { key: 'map', Icon: MapIcon, label: { zh: '地圖', en: 'Map' } },
            ].filter(({ key }) => supported.includes(key)).map(({ key, Icon, label }) => (
              <button
                key={key}
                onClick={() => setParam('view', key === 'map' ? 'map' : '')}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-300',
                  view === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(label)}</span>
              </button>
            ))}
          </div>
        )}
        {hasSeverity(source) && (
          <button
            onClick={() => setParam('only', onlyAlert ? '' : 'alert')}
            className="flex items-center gap-1.5 self-start rounded-full border px-3.5 py-2 text-xs font-medium transition-colors"
            style={
              onlyAlert
                ? { color: '#ef4444', borderColor: withAlpha('#ef4444', 0.4), background: withAlpha('#ef4444', 0.12) }
                : { borderColor: withAlpha(source.accent, 0.2) }
            }
          >
            <TriangleAlert className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t({ zh: '只看異常', en: 'Alerts only' })}</span>
          </button>
        )}
        <button
          onClick={() => toggleFav(source.id)}
          aria-label={isFav(source.id) ? t({ zh: '取消收藏', en: 'Unpin' }) : t({ zh: '加入最愛', en: 'Pin' })}
          aria-pressed={isFav(source.id)}
          className="flex items-center gap-1.5 self-start rounded-full border border-primary/20 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          style={isFav(source.id) ? { color: '#f5b301', borderColor: withAlpha('#f5b301', 0.4), background: withAlpha('#f5b301', 0.12) } : undefined}
        >
          <Star className="h-3.5 w-3.5" style={isFav(source.id) ? { fill: '#f5b301' } : undefined} />
          <span className="hidden sm:inline">{isFav(source.id) ? t({ zh: '已收藏', en: 'Pinned' }) : t({ zh: '收藏', en: 'Pin' })}</span>
        </button>
      </div>

      {!isLoading && items && <SummaryBar source={source} items={items} shown={filtered.length} />}

      {isLoading ? (
        <LoadingSkeleton />
      ) : view === 'map' ? (
        <Suspense fallback={<LoadingSkeleton />}>
          <MapView source={source} items={filtered} detailMap={detailMap} onMarkerClick={onCardClick} />
        </Suspense>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {onlyAlert
            ? t({ zh: '目前沒有需要注意的項目 👍', en: 'Nothing needs attention right now 👍' })
            : t({ zh: '查無符合的資料', en: 'No matching results' })}
        </div>
      ) : (
        <DataList source={source} items={filtered} onCardClick={onCardClick} />
      )}

      {dialog.item && (
        <Suspense fallback={null}>
          <DetailDialog
            source={source}
            open={dialog.open}
            onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
            item={dialog.item}
            detail={dialog.detail}
          />
        </Suspense>
      )}
    </div>
  )
}
