import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { Producer, ProducerType, CreateProducerPayload, UpdateProducerPayload } from '@/domain/producer/types/producer.types'

export const adminProducerApi = {
  list: (params: {
    keyword?: string
    nameKo?: string
    nameEn?: string
    country?: string
    foundedYear?: number
    type?: ProducerType
    page?: number
    size?: number
    sort?: string
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<Producer>>>('/api/producers', { params }),

  create: (data: CreateProducerPayload) =>
    axiosInstance.post<ApiResponse<Producer>>('/api/admin/producers', data),

  update: (id: number, data: UpdateProducerPayload) =>
    axiosInstance.patch<ApiResponse<Producer>>(`/api/admin/producers/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/producers/${id}`),
}
