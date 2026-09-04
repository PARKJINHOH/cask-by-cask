import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  VenueCityDetail,
  VenueCountry,
  VenueDetail,
  VenueSummary,
} from '@/domain/venue/types/venue.types'

export const venueApi = {
  /** 허브 — 장소가 있는 국가와 도시 전부. 국가 셀렉트가 이 한 번의 호출로 완성된다. */
  countries: () =>
    axiosInstance.get<ApiResponse<VenueCountry[]>>('/api/venues/countries'),

  country: (countryCode: string) =>
    axiosInstance.get<ApiResponse<VenueCountry>>(`/api/venues/countries/${countryCode}`),

  /**
   * 도시 하나 + 그 안의 장소 전부.
   *
   * 페이징하지 않는다 — 이 결과가 곧 지도의 마커 집합이라 "1페이지만 지도에 있는" 상태는
   * 사용자에게 버그로 보인다.
   */
  city: (countryCode: string, slug: string) =>
    axiosInstance.get<ApiResponse<VenueCityDetail>>(
      `/api/venues/countries/${countryCode}/cities/${slug}`,
    ),

  detail: (id: number) =>
    axiosInstance.get<ApiResponse<VenueDetail>>(`/api/venues/${id}`),

  search: (keyword: string, countryCode?: string, limit = 10) =>
    axiosInstance.get<ApiResponse<VenueSummary[]>>('/api/venues/search', {
      params: { keyword, countryCode, limit },
    }),
}
