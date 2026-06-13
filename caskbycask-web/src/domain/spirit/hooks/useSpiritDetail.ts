import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '../api/spiritApi'

export function useSpiritDetail(id: number) {
  return useQuery({
    queryKey: ['spirit', id],
    queryFn: () => spiritApi.getDetail(id).then((res) => res.data.data!),
    enabled: !!id,
  })
}

/** 같은 이름의 다른 배치·병입 제품 목록 */
export function useSpiritVariants(id: number) {
  return useQuery({
    queryKey: ['spirit', id, 'variants'],
    queryFn: () => spiritApi.getVariants(id).then((res) => res.data.data ?? []),
    enabled: !!id,
  })
}
