import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  VenueRequest,
  VenueRequestBody,
  VenueRequestStatus,
} from '@/domain/venue/types/venue.types'

export const venueRequestApi = {
  submit: (body: VenueRequestBody) =>
    axiosInstance.post<ApiResponse<VenueRequest>>('/api/venues/requests', body),

  myRequests: () =>
    axiosInstance.get<ApiResponse<VenueRequest[]>>('/api/venues/requests/me'),
}

export const adminVenueRequestApi = {
  list: (params: { status?: VenueRequestStatus; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<VenueRequest>>>('/api/admin/venues/requests', { params }),

  detail: (id: number) =>
    axiosInstance.get<ApiResponse<VenueRequest>>(`/api/admin/venues/requests/${id}`),

  // 도시는 관리자가 고른다 — 제보 폼은 도시를 자유 텍스트로 받으므로 어느 도시 행에
  // 붙일지는 사람이 판단해야 한다.
  approve: (id: number, venueCityId: number) =>
    axiosInstance.patch<ApiResponse<VenueRequest>>(
      `/api/admin/venues/requests/${id}/approve`, null, { params: { venueCityId } },
    ),

  reject: (id: number, rejectReason: string) =>
    axiosInstance.patch<ApiResponse<VenueRequest>>(
      `/api/admin/venues/requests/${id}/reject`, { rejectReason },
    ),
}
