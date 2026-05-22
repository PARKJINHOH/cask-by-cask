import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  CountryStats, RegionStats,
  SpiritCategory, SpiritDetail, SpiritListItem, SpiritSearchParams,
} from '../types/spirit.types'

// Spring `@RequestParam List<T>` 는 `?k=v1&k=v2` 형식만 바인딩.
// axios v1 기본 직렬화는 `?k[]=v1` 이라 호환되지 않으므로 명시적으로 repeated 키 형식으로 직렬화.
function serializeSearchParams(params: Record<string, unknown>): string {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && v !== '') usp.append(key, String(v))
      })
    } else {
      usp.append(key, String(value))
    }
  })
  return usp.toString()
}

export const spiritApi = {
  search: (params: SpiritSearchParams) =>
    axiosInstance.get<ApiResponse<PageResponse<SpiritListItem>>>('/api/spirits', {
      params,
      paramsSerializer: serializeSearchParams,
    }),

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
