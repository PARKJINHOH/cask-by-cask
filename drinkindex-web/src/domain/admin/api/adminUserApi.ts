import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { AdminUser, AdminUserSearchParams, ChangeRoleRequest } from '../types/admin.types'

export const adminUserApi = {
  search: (params: AdminUserSearchParams) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminUser>>>('/api/admin/users', { params }),

  changeRole: (id: number, data: ChangeRoleRequest) =>
    axiosInstance.patch<ApiResponse<AdminUser>>(`/api/admin/users/${id}/role`, data),

  deactivate: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/users/${id}/deactivate`),
}
