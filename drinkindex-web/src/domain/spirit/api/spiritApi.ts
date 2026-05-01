import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { SpiritDetail, SpiritListItem, SpiritSearchParams } from '../types/spirit.types'

export const spiritApi = {
  search: (params: SpiritSearchParams) =>
    axiosInstance.get<ApiResponse<PageResponse<SpiritListItem>>>('/api/spirits', { params }),

  getDetail: (id: number) =>
    axiosInstance.get<ApiResponse<SpiritDetail>>(`/api/spirits/${id}`),
}
