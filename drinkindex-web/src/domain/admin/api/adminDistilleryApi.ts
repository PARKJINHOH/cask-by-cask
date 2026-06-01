import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { Distillery, CreateDistilleryPayload, UpdateDistilleryPayload } from '@/domain/distillery/types/distillery.types'

export const adminDistilleryApi = {
  list: (params: {
    keyword?: string
    nameKo?: string
    nameEn?: string
    country?: string
    foundedYear?: number
    page?: number
    size?: number
    sort?: string
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<Distillery>>>('/api/distilleries', { params }),

  create: (data: CreateDistilleryPayload) =>
    axiosInstance.post<ApiResponse<Distillery>>('/api/admin/distilleries', data),

  update: (id: number, data: UpdateDistilleryPayload) =>
    axiosInstance.patch<ApiResponse<Distillery>>(`/api/admin/distilleries/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/distilleries/${id}`),
}
