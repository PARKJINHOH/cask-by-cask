import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  CountryStats, RegionStats,
  SpiritCategory, SpiritCategoryStat, SpiritDetail, SpiritListItem, SpiritSearchCount,
  SpiritSearchParams, SpiritVariant,
  SpiritAutocompleteItem, CreateSpiritVariantRequest,
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

  /**
   * 같은 조건의 등록 건수. 목록의 `totalElements` 는 페이지 계산용 마스터 수라
   * 에디션까지 더한 숫자는 이쪽으로 따로 받는다.
   */
  count: (params: SpiritSearchParams) =>
    axiosInstance.get<ApiResponse<SpiritSearchCount>>('/api/spirits/count', {
      params,
      paramsSerializer: serializeSearchParams,
    }),

  /** 카테고리별 등록 주류 수(에디션 포함) — 메인 홈 사이드바 통계 */
  getCategoryStats: () =>
    axiosInstance.get<ApiResponse<SpiritCategoryStat[]>>('/api/spirits/category-stats'),

  getDetail: (id: number) =>
    axiosInstance.get<ApiResponse<SpiritDetail>>(`/api/spirits/${id}`),

  /** 같은 이름의 다른 배치·병입 제품 목록 */
  getVariants: (id: number) =>
    axiosInstance.get<ApiResponse<SpiritVariant[]>>(`/api/spirits/${id}/variants`),

  createVariant: (id: number, data: CreateSpiritVariantRequest) =>
    axiosInstance.post<ApiResponse<SpiritVariant>>(`/api/spirits/${id}/variants`, data),

  getCountries: (category?: SpiritCategory) =>
    axiosInstance.get<ApiResponse<CountryStats[]>>('/api/spirits/countries', {
      params: category ? { category } : undefined,
    }),

  getRegions: (category: SpiritCategory, country: string) =>
    axiosInstance.get<ApiResponse<RegionStats[]>>('/api/spirits/regions', {
      params: { category, country },
    }),

  autocomplete: (keyword: string, signal?: AbortSignal, includeVariants = false) =>
    axiosInstance.get<ApiResponse<SpiritAutocompleteItem[]>>('/api/spirits/autocomplete', {
      params: { keyword, includeVariants },
      signal,
    }),
}

