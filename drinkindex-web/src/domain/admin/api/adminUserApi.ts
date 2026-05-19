import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { AdminUser, AdminUserSearchParams, ChangeRoleRequest, SuspendUserRequest, UpdateBoardPermissionsRequest } from '../types/admin.types'

export const adminUserApi = {
  search: (params: AdminUserSearchParams) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminUser>>>('/api/admin/users', { params }),

  getUser: (id: number) =>
    axiosInstance.get<ApiResponse<AdminUser>>(`/api/admin/users/${id}`),

  changeRole: (id: number, data: ChangeRoleRequest) =>
    axiosInstance.patch<ApiResponse<AdminUser>>(`/api/admin/users/${id}/role`, data),

  deactivate: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/users/${id}/deactivate`),

  activate: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/users/${id}/activate`),

  suspend: (id: number, data: SuspendUserRequest) =>
    axiosInstance.post<ApiResponse<null>>(`/api/admin/users/${id}/suspend`, data),

  deleteUser: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/users/${id}`),

  updateBoardPermissions: (id: number, data: UpdateBoardPermissionsRequest) =>
    axiosInstance.put<ApiResponse<AdminUser>>(`/api/admin/users/${id}/board-permissions`, data),
}
