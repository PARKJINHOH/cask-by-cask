import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { Producer, ProducerType } from '../types/producer.types'

export const producerApi = {
  search: (params: { keyword?: string; country?: string; type?: ProducerType; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<Producer>>>('/api/producers', { params }),

  findById: (id: number) =>
    axiosInstance.get<ApiResponse<Producer>>(`/api/producers/${id}`),
}
