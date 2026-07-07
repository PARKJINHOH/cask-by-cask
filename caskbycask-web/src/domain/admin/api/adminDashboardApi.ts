import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'

export interface DashboardKpis {
  totalUsers: number
  todayNewUsers: number
  pendingReports: number
  pendingRequests: number
}

export interface DailyStatItem {
  date: string
  count: number
  cumulativeCount: number
  deletedCount: number
}

export interface CategoryStatItem {
  category: string
  count: number
}

export interface ReportStatItem {
  status: string
  count: number
}

export const adminDashboardApi = {
  getKpis: () =>
    axiosInstance.get<ApiResponse<DashboardKpis>>('/api/admin/dashboard/kpis'),

  getUserTrend: (period: number) =>
    axiosInstance.get<ApiResponse<DailyStatItem[]>>('/api/admin/dashboard/user-trend', {
      params: { period },
    }),

  getCategoryStats: () =>
    axiosInstance.get<ApiResponse<CategoryStatItem[]>>('/api/admin/dashboard/category-stats'),

  getReviewTrend: (period: number) =>
    axiosInstance.get<ApiResponse<DailyStatItem[]>>('/api/admin/dashboard/review-trend', {
      params: { period },
    }),

  getReportStats: () =>
    axiosInstance.get<ApiResponse<ReportStatItem[]>>('/api/admin/dashboard/report-stats'),
}
