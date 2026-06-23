import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { ScoreHistoryFilterType, ScoreHistoryItem, LevelInfo } from '../types/score.types'
import type { AttendanceResult } from '@/domain/auth/types/auth.types'

export const scoreApi = {
  getMyHistory: (params: {
    page: number
    size?: number
    type?: ScoreHistoryFilterType
  }) => {
    const { page, size = 20, type = 'ALL' } = params
    const query = new URLSearchParams({ page: String(page), size: String(size) })
    if (type !== 'ALL') query.set('type', type)
    return axiosInstance.get<ApiResponse<PageResponse<ScoreHistoryItem>>>(
      `/api/score-history/me?${query}`,
    )
  },

  getLevelConfigs: () =>
    axiosInstance.get<ApiResponse<LevelInfo[]>>('/api/score-history/level-config'),

  checkAttendance: () =>
    axiosInstance.post<ApiResponse<AttendanceResult>>('/api/attendance'),

  getTodayAttendanceStatus: () =>
    axiosInstance.get<ApiResponse<boolean>>('/api/attendance/today'),

  getAttendanceHistory: () =>
    axiosInstance.get<ApiResponse<string[]>>('/api/attendance/history'),
}
