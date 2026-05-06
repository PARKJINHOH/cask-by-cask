import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '../api/spiritApi'
import { useSpiritStore } from '../store/spiritStore'

export function useSpirits() {
  const { keyword, category, country, sort, page } = useSpiritStore()

  return useQuery({
    queryKey: ['spirits', { keyword, category, country, sort, page }],
    queryFn: () =>
      spiritApi
        .search({
          keyword:  keyword  || undefined,
          category: category || undefined,
          country:  country  || undefined,
          sort,
          page,
          size: 20,
        })
        .then((res) => res.data.data!),
  })
}
