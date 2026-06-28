import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { SpiritSeo } from '../types/spirit.types'

export const spiritSeoApi = {
  getSeo: (id: number) =>
    axiosInstance.get<ApiResponse<SpiritSeo>>(`/api/seo/spirits/${id}`),
}
