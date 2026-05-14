import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { CognacAppellation, CreateCognacAppellationPayload, UpdateCognacAppellationPayload } from '@/domain/cognacappellation/types/cognacappellation.types'

export const adminCognacAppellationApi = {
  list: (params: { keyword?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<CognacAppellation>>>('/api/cognac-appellations', { params }),

  create: (data: CreateCognacAppellationPayload) =>
    axiosInstance.post<ApiResponse<CognacAppellation>>('/api/admin/cognac-appellations', data),

  update: (id: number, data: UpdateCognacAppellationPayload) =>
    axiosInstance.patch<ApiResponse<CognacAppellation>>(`/api/admin/cognac-appellations/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/cognac-appellations/${id}`),
}
