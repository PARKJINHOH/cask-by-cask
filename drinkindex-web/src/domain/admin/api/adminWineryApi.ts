import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { Winery, CreateWineryPayload, UpdateWineryPayload } from '@/domain/winery/types/winery.types'

export const adminWineryApi = {
  list: (params: { keyword?: string; country?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<Winery>>>('/api/wineries', { params }),

  create: (data: CreateWineryPayload) =>
    axiosInstance.post<ApiResponse<Winery>>('/api/admin/wineries', data),

  update: (id: number, data: UpdateWineryPayload) =>
    axiosInstance.patch<ApiResponse<Winery>>(`/api/admin/wineries/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/wineries/${id}`),
}
