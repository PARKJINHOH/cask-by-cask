import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  CreateReviewRequest,
  CreateVariantReviewRequest,
  ReviewEmbedItem,
  ReviewItem,
  UpdateReviewRequest,
  VariantReviewRequestItem,
  VariantReviewRequestStatus,
} from '../types/review.types'
import type { SocialPublishSelection } from '@/domain/social/types/social.types'

export const reviewApi = {
  getReviews: (spiritId: number, params?: { sort?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>(
      `/api/spirits/${spiritId}/reviews`,
      { params },
    ),

  createReview: (spiritId: number, data: CreateReviewRequest) =>
    axiosInstance.post<ApiResponse<ReviewItem>>(`/api/spirits/${spiritId}/reviews`, data),

  createVariantReviewRequest: (spiritId: number, data: CreateVariantReviewRequest) =>
    axiosInstance.post<ApiResponse<VariantReviewRequestItem>>(
      `/api/spirits/${spiritId}/reviews/variant-request`,
      data,
    ),

  updateReview: (spiritId: number, reviewId: number, data: UpdateReviewRequest) =>
    axiosInstance.patch<ApiResponse<ReviewItem>>(
      `/api/spirits/${spiritId}/reviews/${reviewId}`,
      data,
    ),

  deleteReview: (spiritId: number, reviewId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/spirits/${spiritId}/reviews/${reviewId}`),

  getMyReviews: (params?: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>('/api/users/me/reviews', { params }),

  getMyReviewEmbeds: (params?: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewEmbedItem>>>('/api/users/me/review-embeds', { params }),

  getMyReviewRequests: (params?: { page?: number; size?: number; status?: VariantReviewRequestStatus }) =>
    axiosInstance.get<ApiResponse<PageResponse<VariantReviewRequestItem>>>(
      '/api/users/me/review-requests',
      { params },
    ),

  updateMyReviewRequest: (requestId: number, data: CreateVariantReviewRequest) =>
    axiosInstance.patch<ApiResponse<VariantReviewRequestItem>>(
      `/api/users/me/review-requests/${requestId}`,
      data,
    ),

  requestInitialSocialPublications: (
    spiritId: number,
    reviewId: number,
    data: SocialPublishSelection,
  ) =>
    axiosInstance.post<ApiResponse<null>>(
      `/api/spirits/${spiritId}/reviews/${reviewId}/social-publications`,
      data,
    ),

  resubmitMyReviewRequest: (requestId: number, data: CreateVariantReviewRequest) =>
    axiosInstance.patch<ApiResponse<VariantReviewRequestItem>>(
      `/api/users/me/review-requests/${requestId}/resubmit-review`,
      data,
    ),

  deleteMyReviewRequest: (requestId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/users/me/review-requests/${requestId}`),

  getUserReviews: (userId: number, params?: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>(`/api/users/${userId}/reviews`, { params }),
}
