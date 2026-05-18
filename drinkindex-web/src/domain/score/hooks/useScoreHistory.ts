import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { scoreApi } from '../api/scoreApi'
import type { ScoreHistoryFilterType } from '../types/score.types'

export function useLevelConfigs() {
  return useQuery({
    queryKey: ['levelConfigs'],
    queryFn: () => scoreApi.getLevelConfigs().then((res) => res.data.data ?? []),
    staleTime: 1000 * 60 * 10, // 10분 캐시 — 레벨 설정은 자주 바뀌지 않음
  })
}

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
