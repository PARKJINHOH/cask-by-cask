import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { MyRankItem, RankingItem, RankingPeriod } from '../types/ranking.types'

export const rankingApi = {
  getRanking: (params: { period: RankingPeriod; page: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<RankingItem>>>('/api/ranking', {
      params: { period: params.period, page: params.page, size: params.size ?? 50 },
    }),

  getMyRank: (period: RankingPeriod) =>
    axiosInstance.get<ApiResponse<MyRankItem>>('/api/ranking/me', {
      params: { period },
    }),
}
