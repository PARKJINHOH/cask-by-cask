import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { CreateReviewRequest, ReviewItem, UpdateReviewRequest } from '../types/review.types'

export const reviewApi = {
  getReviews: (spiritId: number, params?: { sort?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>(
      `/api/spirits/${spiritId}/reviews`,
      { params },
    ),

  createReview: (spiritId: number, data: CreateReviewRequest) =>
    axiosInstance.post<ApiResponse<ReviewItem>>(`/api/spirits/${spiritId}/reviews`, data),

  updateReview: (spiritId: number, reviewId: number, data: UpdateReviewRequest) =>
    axiosInstance.patch<ApiResponse<ReviewItem>>(
      `/api/spirits/${spiritId}/reviews/${reviewId}`,
      data,
    ),

  deleteReview: (spiritId: number, reviewId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/spirits/${spiritId}/reviews/${reviewId}`),

  getMyReviews: (params?: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>('/api/users/me/reviews', { params }),

  getUserReviews: (userId: number, params?: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ReviewItem>>>(`/api/users/${userId}/reviews`, { params }),
}
