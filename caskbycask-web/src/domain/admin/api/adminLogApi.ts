import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { AdminLog, AdminLogSearchParams } from '../types/admin.types'

export const adminLogApi = {
  getLogs: (params: AdminLogSearchParams) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminLog>>>('/api/admin/logs', { params }),
}
