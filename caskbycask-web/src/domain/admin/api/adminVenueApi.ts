import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  AdminVenue,
  AdminVenueCity,
  VenueCityUpsertPayload,
  VenueLinkResolveResult,
  VenueStatus,
  VenueType,
  VenueUpsertPayload,
} from '@/domain/venue/types/venue.types'

export interface AdminVenueListParams {
  keyword?: string
  countryCode?: string
  cityId?: number
  venueType?: VenueType
  status?: VenueStatus
  page?: number
  size?: number
  sort?: string
}

export const adminVenueApi = {
  list: (params: AdminVenueListParams) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminVenue>>>('/api/admin/venues', { params }),

  detail: (id: number) =>
    axiosInstance.get<ApiResponse<AdminVenue>>(`/api/admin/venues/${id}`),

  create: (data: VenueUpsertPayload) =>
    axiosInstance.post<ApiResponse<AdminVenue>>('/api/admin/venues', data),

  // 서버와 마찬가지로 전체 치환이다 — PATCH 는 이 저장소의 관리자 CRUD 관례일 뿐 의미는 치환.
  update: (id: number, data: VenueUpsertPayload) =>
    axiosInstance.patch<ApiResponse<AdminVenue>>(`/api/admin/venues/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/venues/${id}`),

  /**
   * 붙여넣은 지도 링크에서 좌표를 뽑는다.
   *
   * <p>실패해도 200 이다 — 좌표를 못 얻는 것은 오류가 아니라 정상 흐름이고(네이버 단축 링크는
   * 원리상 좌표가 없다), 화면은 `source` 를 보고 안내를 바꾼 뒤 수동 핀으로 넘긴다.
   */
  resolveLink: (data: { link: string; addressHint?: string }) =>
    axiosInstance.post<ApiResponse<VenueLinkResolveResult>>(
      '/api/admin/venues/resolve-link',
      data,
    ),

  // ── 도시 ──────────────────────────────────────────────

  listCities: () =>
    axiosInstance.get<ApiResponse<AdminVenueCity[]>>('/api/admin/venues/cities'),

  createCity: (data: VenueCityUpsertPayload) =>
    axiosInstance.post<ApiResponse<AdminVenueCity>>('/api/admin/venues/cities', data),

  updateCity: (id: number, data: VenueCityUpsertPayload) =>
    axiosInstance.patch<ApiResponse<AdminVenueCity>>(`/api/admin/venues/cities/${id}`, data),

  deleteCity: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/venues/cities/${id}`),
}
