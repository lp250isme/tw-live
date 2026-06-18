import { useState, useMemo, lazy, Suspense } from 'react'
import { useParams, useSearchParams, Navigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { LayoutGrid, Map as MapIcon } from 'lucide-react'
import { getSource } from '@/lib/sources'
import { useSourceList } from '@/hooks/use-source'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import SearchFilter from '@/components/search-filter'
import DataGrid from '@/components/data-grid'
import DetailDialog from '@/components/detail-dialog'
import LoadingSkeleton from '@/components/loading-skeleton'
import ErrorState from '@/components/error-state'

const MapView = lazy(() => import('@/components/map-view'))

export default function SourcePage() {
  const { sourceId } = useParams()
  const source = getSource(sourceId)
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useState({ open: false, item: null, detail: null })

  const hasMap = !!source && source.views.includes('map')
  const view = params.get('view') === 'map' && hasMap ? 'map' : 'grid'
  const search = params.get('q') || ''
  const sortBy = params.get('sort') || source?.sortOptions?.[0]?.key || 'name'

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
    const q = search.trim()
    let result = q
      ? items.filter((it) => source.searchFields(it).some((f) => (f || '').includes(q)))
      : [...items]
    const cmp = {
      name: (a, b) => a.name.localeCompare(b.name, 'zh-TW'),
      group: (a, b) => (a.group || '').localeCompare(b.group || '', 'zh-TW'),
      'value-asc': (a, b) => (valueOf(a) ?? -1) - (valueOf(b) ?? -1),
      'value-desc': (a, b) => (valueOf(b) ?? -1) - (valueOf(a) ?? -1),
    }[sortBy]
    if (cmp) result.sort(cmp)
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, sortBy, detailMap, source])

  if (!source) return <Navigate to="/" replace />

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

  const onCardClick = (item, detail) => setDialog({ open: true, item, detail })

  if (error) return <ErrorState onRetry={refetch} />

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchFilter
          source={source}
          search={search}
          onSearchChange={(v) => setParam('q', v)}
          sortBy={sortBy}
          onSortChange={(v) => setParam('sort', v)}
        />
        {hasMap && (
          <div className="flex rounded-full border border-primary/20 p-0.5 neon-toggle self-start">
            {[
              { key: 'grid', Icon: LayoutGrid, label: { zh: '列表', en: 'Grid' } },
              { key: 'map', Icon: MapIcon, label: { zh: '地圖', en: 'Map' } },
            ].map(({ key, Icon, label }) => (
              <button
                key={key}
                onClick={() => setParam('view', key === 'map' ? 'map' : '')}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-300',
                  view === key ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(14,165,233,0.4)]' : 'hover:text-primary'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(label)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isLoading && items && (
        <div className="flex items-center gap-4 mb-5 text-xs tracking-wider uppercase">
          <div className="flex items-center gap-2 text-primary/70">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>ONLINE</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-foreground/80">
              {filtered.length} {t({ zh: '筆', en: 'items' })}
            </span>
          </div>
          {search && (
            <span className="text-muted-foreground/60">
              FILTER: <span className="text-primary/80">{search}</span>
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : view === 'grid' ? (
        <DataGrid source={source} items={filtered} onCardClick={onCardClick} />
      ) : (
        <Suspense fallback={<LoadingSkeleton />}>
          <MapView source={source} items={filtered} detailMap={detailMap} onMarkerClick={onCardClick} />
        </Suspense>
      )}

      <DetailDialog
        source={source}
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        item={dialog.item}
        detail={dialog.detail}
      />
    </>
  )
}
