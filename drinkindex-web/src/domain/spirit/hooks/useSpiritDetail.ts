import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '../api/spiritApi'

export function useSpiritDetail(id: number) {
  return useQuery({
    queryKey: ['spirit', id],
    queryFn: () => spiritApi.getDetail(id).then((res) => res.data.data!),
    enabled: !!id,
  })
}
