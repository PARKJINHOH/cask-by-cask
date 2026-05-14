import axiosInstance from './axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'

export const appellationApi = {
  search: (keyword: string, limit = 8) =>
    axiosInstance
      .get<ApiResponse<string[]>>('/api/appellations/search', { params: { keyword, limit } })
      .then((res) => res.data.data ?? []),
}
