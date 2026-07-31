import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  CreateReviewRequest,
  CreateVariantReviewRequest,
  RecentReviewItem,
  ReviewEmbedItem,
  ReviewItem,
  ReviewImagePlanItem,
  UpdateReviewRequest,
  VariantReviewRequestItem,
  VariantReviewRequestStatus,
} from '../types/review.types'
import type { SocialPublishSelection } from '@/domain/social/types/social.types'

export const reviewApi = {
  /** 메인 "최근 등록된 리뷰" — 마스터 주류 단위 중복 없이 최신순 (공개 API) */
  getRecentReviews: (size = 10) =>
    axiosInstance.get<ApiResponse<RecentReviewItem[]>>('/api/public/reviews/recent', {
      params: { size },
    }),

  getReviews: (spiritId: number, params?: { sort?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>(
      `/api/spirits/${spiritId}/reviews`,
      { params },
    ),

  createReview: (spiritId: number, data: CreateReviewRequest, images: File[] = []) => {
    if (images.length === 0) {
      return axiosInstance.post<ApiResponse<ReviewItem>>(`/api/spirits/${spiritId}/reviews`, data)
    }
    return axiosInstance.post<ApiResponse<ReviewItem>>(
      `/api/spirits/${spiritId}/reviews`,
      reviewFormData(data, images),
      multipartConfig,
    )
  },

  createVariantReviewRequest: (
    spiritId: number,
    data: CreateVariantReviewRequest,
    images: File[] = [],
  ) => {
    if (images.length === 0) {
      return axiosInstance.post<ApiResponse<VariantReviewRequestItem>>(
        `/api/spirits/${spiritId}/reviews/variant-request`,
        data,
      )
    }
    return axiosInstance.post<ApiResponse<VariantReviewRequestItem>>(
      `/api/spirits/${spiritId}/reviews/variant-request`,
      reviewFormData(data, images),
      multipartConfig,
    )
  },

  updateReview: (
    spiritId: number,
    reviewId: number,
    data: UpdateReviewRequest,
    imagePlan?: ReviewImagePlanItem[],
    images: File[] = [],
  ) => imagePlan === undefined
    ? axiosInstance.patch<ApiResponse<ReviewItem>>(
        `/api/spirits/${spiritId}/reviews/${reviewId}`,
        data,
      )
    : axiosInstance.patch<ApiResponse<ReviewItem>>(
        `/api/spirits/${spiritId}/reviews/${reviewId}`,
        reviewFormData(data, images, imagePlan),
        multipartConfig,
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

  updateMyReviewRequest: (
    requestId: number,
    data: CreateVariantReviewRequest,
    imagePlan?: ReviewImagePlanItem[],
    images: File[] = [],
  ) => imagePlan === undefined
    ? axiosInstance.patch<ApiResponse<VariantReviewRequestItem>>(
        `/api/users/me/review-requests/${requestId}`,
        data,
      )
    : axiosInstance.patch<ApiResponse<VariantReviewRequestItem>>(
        `/api/users/me/review-requests/${requestId}`,
        reviewFormData(data, images, imagePlan),
        multipartConfig,
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

  resubmitMyReviewRequest: (
    requestId: number,
    data: CreateVariantReviewRequest,
    imagePlan?: ReviewImagePlanItem[],
    images: File[] = [],
  ) => imagePlan === undefined
    ? axiosInstance.patch<ApiResponse<VariantReviewRequestItem>>(
        `/api/users/me/review-requests/${requestId}/resubmit-review`,
        data,
      )
    : axiosInstance.patch<ApiResponse<VariantReviewRequestItem>>(
        `/api/users/me/review-requests/${requestId}/resubmit-review`,
        reviewFormData(data, images, imagePlan),
        multipartConfig,
      ),

  deleteMyReviewRequest: (requestId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/users/me/review-requests/${requestId}`),

  getUserReviews: (userId: number, params?: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>(`/api/users/${userId}/reviews`, { params }),
}

const multipartConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
}

function reviewFormData(
  request: CreateReviewRequest | CreateVariantReviewRequest | UpdateReviewRequest,
  images: File[],
  imagePlan?: ReviewImagePlanItem[],
) {
  const formData = new FormData()
  formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }))
  if (imagePlan !== undefined) {
    formData.append('imagePlan', new Blob([JSON.stringify(imagePlan)], { type: 'application/json' }))
  }
  images.forEach((image) => formData.append('images', image))
  return formData
}
