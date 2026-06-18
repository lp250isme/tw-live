import { useQuery } from '@tanstack/react-query'

// Generic list query for any data source. Each source owns its fetchList()
// (which returns normalized items) and refreshMs cadence.
export function useSourceList(source) {
  return useQuery({
    queryKey: ['src', source.id],
    queryFn: () => source.fetchList(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: source.refreshMs ?? false,
  })
}
