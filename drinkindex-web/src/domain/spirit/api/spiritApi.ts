import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  CountryStats, RegionStats,
  SpiritCategory, SpiritDetail, SpiritListItem, SpiritSearchParams,
} from '../types/spirit.types'

export const spiritApi = {
  search: (params: SpiritSearchParams) =>
    axiosInstance.get<ApiResponse<PageResponse<SpiritListItem>>>('/api/spirits', { params }),

  getDetail: (id: number) =>
    axiosInstance.get<ApiResponse<SpiritDetail>>(`/api/spirits/${id}`),

  getCountries: (category?: SpiritCategory) =>
    axiosInstance.get<ApiResponse<CountryStats[]>>('/api/spirits/countries', {
      params: category ? { category } : undefined,
    }),

  getRegions: (category: SpiritCategory, country: string) =>
    axiosInstance.get<ApiResponse<RegionStats[]>>('/api/spirits/regions', {
      params: { category, country },
    }),
}
