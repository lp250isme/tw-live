import { useQuery } from '@tanstack/react-query'

// Generic list query for any data source. Each source owns its fetchList()
// (which returns normalized items) and refreshMs cadence.
export function useSourceList(source) {
  return useQuery({
    queryKey: ['src', source.id],
    queryFn: () => source.fetchList(),
    // Align freshness to each source's own cadence (e.g. oil price updates
    // weekly) so re-navigating between sources doesn't refetch needlessly;
    // floor at 5 min for sources without an explicit refreshMs.
    staleTime: source.refreshMs ?? 5 * 60 * 1000,
    refetchInterval: source.refreshMs ?? false,
  })
}
