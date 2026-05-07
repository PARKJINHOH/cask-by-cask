import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { Distillery } from '../types/distillery.types'

export const distilleryApi = {
  search: (params: { keyword?: string; country?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<Distillery>>>('/api/distilleries', { params }),
}
