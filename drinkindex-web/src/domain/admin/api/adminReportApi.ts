import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { AdminReport, ReportStatus, ReportTargetType } from '../types/admin.types'

export const adminReportApi = {
  list: (params: {
    status?: ReportStatus
    targetType?: ReportTargetType
    page?: number
    size?: number
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminReport>>>('/api/admin/reports', { params }),

  resolve: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/reports/${id}/resolve`),

  dismiss: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/reports/${id}/dismiss`),
}
