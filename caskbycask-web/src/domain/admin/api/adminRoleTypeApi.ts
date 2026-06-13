import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { RoleType, CreateRoleTypeRequest, UpdateRoleTypeRequest } from '../types/admin.types'

export const adminRoleTypeApi = {
  getAll: () =>
    axiosInstance.get<ApiResponse<RoleType[]>>('/api/admin/role-types'),

  create: (data: CreateRoleTypeRequest) =>
    axiosInstance.post<ApiResponse<RoleType>>('/api/admin/role-types', data),

  update: (id: number, data: UpdateRoleTypeRequest) =>
    axiosInstance.put<ApiResponse<RoleType>>(`/api/admin/role-types/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/role-types/${id}`),
}
