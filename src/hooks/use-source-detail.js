import { useQuery } from '@tanstack/react-query'

// Generic per-item detail query (e.g. a reservoir's real-time storage).
// Disabled for sources whose list already carries the value (hasDetail=false).
export function useSourceDetail(source, item, enabled = true) {
  return useQuery({
    queryKey: ['src-detail', source.id, item?.id],
    queryFn: () => source.fetchDetail(item),
    enabled: !!item && enabled && !!source?.hasDetail,
    staleTime: 5 * 60 * 1000,
  })
}
