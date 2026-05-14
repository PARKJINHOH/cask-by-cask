import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { CognacHouse, CreateCognacHousePayload, UpdateCognacHousePayload } from '@/domain/cognachouse/types/cognachouse.types'

export const adminCognacHouseApi = {
  list: (params: { keyword?: string; country?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<CognacHouse>>>('/api/cognac-houses', { params }),

  create: (data: CreateCognacHousePayload) =>
    axiosInstance.post<ApiResponse<CognacHouse>>('/api/admin/cognac-houses', data),

  update: (id: number, data: UpdateCognacHousePayload) =>
    axiosInstance.patch<ApiResponse<CognacHouse>>(`/api/admin/cognac-houses/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/cognac-houses/${id}`),
}
