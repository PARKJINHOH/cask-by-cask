import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { scoreApi } from '../api/scoreApi'
import type { ScoreHistoryFilterType } from '../types/score.types'

export function useInfiniteScoreHistory(type: ScoreHistoryFilterType) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)

  return useInfiniteQuery({
    queryKey: ['scoreHistory', 'me', type],
    queryFn: ({ pageParam }) =>
      scoreApi
        .getMyHistory({ page: pageParam as number, size: 20, type })
        .then((res) => res.data.data!),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
    enabled: isLoggedIn,
  })
}
