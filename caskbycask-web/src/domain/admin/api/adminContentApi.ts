import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { AdminReview, ModerationPayload } from '../types/admin.types'

export const adminContentApi = {
  listReviews: (params: {
    isHidden?: boolean
    spiritId?: number
    page?: number
    size?: number
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminReview>>>('/api/admin/reviews', { params }),

  hideReview: (id: number, data: ModerationPayload) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/reviews/${id}/hide`, data),

  unhideReview: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/reviews/${id}/unhide`),

  deleteReview: (id: number, data: ModerationPayload) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/reviews/${id}`, { data }),
}
