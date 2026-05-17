import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { rankingApi } from '../api/rankingApi'
import type { RankingPeriod } from '../types/ranking.types'

export function useRanking(period: RankingPeriod, page: number) {
  return useQuery({
    queryKey: ['ranking', period, page],
    queryFn: () =>
      rankingApi.getRanking({ period, page }).then((res) => res.data.data!),
    staleTime: 60_000,   // 1분 캐시
  })
}

export function useMyRank(period: RankingPeriod) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: ['ranking', 'me', period],
    queryFn: () => rankingApi.getMyRank(period).then((res) => res.data.data!),
    enabled: isLoggedIn,
    staleTime: 60_000,
  })
}
