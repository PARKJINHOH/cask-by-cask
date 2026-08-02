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
  UserReviewCategoryCounts,
  VariantReviewRequestItem,
  VariantReviewRequestStatus,
} from '../types/review.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
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

  getMyReviews: (params?: { page?: number; size?: number; category?: SpiritCategory }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>('/api/users/me/reviews', {
      // category 는 값이 있을 때만 전송 (빈 값 전송 시 서버가 필터로 오인하지 않도록)
      params: {
        page: params?.page,
        size: params?.size,
        ...(params?.category ? { category: params.category } : {}),
      },
    }),

  getMyReviewCategoryCounts: () =>
    axiosInstance.get<ApiResponse<UserReviewCategoryCounts>>('/api/users/me/reviews/category-counts'),

  /** 리뷰 수정 페이지 진입용 단건 조회 (본인 리뷰) */
  getMyReview: (reviewId: number) =>
    axiosInstance.get<ApiResponse<ReviewItem>>(`/api/users/me/reviews/${reviewId}`),

  getMyReviewEmbeds: (params?: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewEmbedItem>>>('/api/users/me/review-embeds', { params }),

  getMyReviewRequests: (params?: {
    page?: number
    size?: number
    status?: VariantReviewRequestStatus
    category?: SpiritCategory
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<VariantReviewRequestItem>>>(
      '/api/users/me/review-requests',
      {
        params: {
          page: params?.page,
          size: params?.size,
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.category ? { category: params.category } : {}),
        },
      },
    ),

  getMyReviewRequestCategoryCounts: (status?: VariantReviewRequestStatus) =>
    axiosInstance.get<ApiResponse<UserReviewCategoryCounts>>(
      '/api/users/me/review-requests/category-counts',
      { params: status ? { status } : undefined },
    ),

  /** 리뷰 수정 페이지 진입용 단건 조회 (본인 하위 에디션 요청) */
  getMyReviewRequest: (requestId: number) =>
    axiosInstance.get<ApiResponse<VariantReviewRequestItem>>(
      `/api/users/me/review-requests/${requestId}`,
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

  getUserReviews: (
    userId: number,
    params?: { page?: number; size?: number; category?: SpiritCategory; keyword?: string },
  ) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>(`/api/users/${userId}/reviews`, {
      // category/keyword 는 값이 있을 때만 전송 (빈 문자열 전송 시 서버가 필터로 오인하지 않도록)
      params: {
        page: params?.page,
        size: params?.size,
        ...(params?.category ? { category: params.category } : {}),
        ...(params?.keyword?.trim() ? { keyword: params.keyword.trim() } : {}),
      },
    }),

  getUserReviewCategoryCounts: (userId: number) =>
    axiosInstance.get<ApiResponse<UserReviewCategoryCounts>>(
      `/api/users/${userId}/reviews/category-counts`,
    ),
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
