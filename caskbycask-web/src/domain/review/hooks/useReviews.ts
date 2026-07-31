import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { reviewApi } from '../api/reviewApi'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import type {
  CreateReviewRequest,
  CreateVariantReviewRequest,
  ReviewImagePlanItem,
  UpdateReviewRequest,
  VariantReviewRequestStatus,
} from '../types/review.types'

export function useReviews(spiritId: number, page = 0) {
  return useQuery({
    queryKey: ['reviews', spiritId, page],
    queryFn: () =>
      reviewApi.getReviews(spiritId, { page, size: 10 }).then((res) => res.data.data!),
  })
}

export function useMyReviews(page = 0) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['my-reviews', page],
    queryFn: () => reviewApi.getMyReviews({ page, size: 10 }).then((res) => res.data.data!),
    enabled: isAuthReady && isLoggedIn,
  })
}

export function useMyReviewRequests(page = 0, status?: VariantReviewRequestStatus) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['my-review-requests', page, status],
    queryFn: () =>
      reviewApi
        .getMyReviewRequests({ page, size: 10, status })
        .then((res) => res.data.data!),
    enabled: isAuthReady && isLoggedIn,
  })
}

export function useCreateReview(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ data, images = [] }: { data: CreateReviewRequest; images?: File[] }) =>
      reviewApi.createReview(spiritId, data, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', spiritId] })
      queryClient.invalidateQueries({ queryKey: ['spirit', spiritId] })
    },
  })
}

export function useCreateVariantReviewRequest(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ data, images = [] }: { data: CreateVariantReviewRequest; images?: File[] }) =>
      reviewApi.createVariantReviewRequest(spiritId, data, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-review-requests'] })
    },
  })
}

export function useUpdateMyReviewRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      requestId, data, imagePlan, images = [],
    }: {
      requestId: number
      data: CreateVariantReviewRequest
      imagePlan?: ReviewImagePlanItem[]
      images?: File[]
    }) => reviewApi.updateMyReviewRequest(requestId, data, imagePlan, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-review-requests'] })
    },
  })
}

export function useResubmitMyReviewRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      requestId, data, imagePlan, images = [],
    }: {
      requestId: number
      data: CreateVariantReviewRequest
      imagePlan?: ReviewImagePlanItem[]
      images?: File[]
    }) => reviewApi.resubmitMyReviewRequest(requestId, data, imagePlan, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-review-requests'] })
    },
  })
}

export function useDeleteMyReviewRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestId: number) => reviewApi.deleteMyReviewRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-review-requests'] })
    },
  })
}

export function useUpdateReview(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      reviewId, data, imagePlan, images = [],
    }: {
      reviewId: number
      data: UpdateReviewRequest
      imagePlan?: ReviewImagePlanItem[]
      images?: File[]
    }) => reviewApi.updateReview(spiritId, reviewId, data, imagePlan, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', spiritId] })
      queryClient.invalidateQueries({ queryKey: ['spirit', spiritId] })
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
    },
  })
}

export function useDeleteReview(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: number) => reviewApi.deleteReview(spiritId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', spiritId] })
      queryClient.invalidateQueries({ queryKey: ['spirit', spiritId] })
    },
  })
}

export function useDeleteMyReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ spiritId, reviewId }: { spiritId: number; reviewId: number }) =>
      reviewApi.deleteReview(spiritId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      queryClient.invalidateQueries({ queryKey: ['spirit'] })
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['user-review-category-counts'] })
    },
  })
}

export interface UserReviewsQueryParams {
  page?: number
  size?: number
  category?: SpiritCategory | null
  keyword?: string
}

export function useUserReviews(userId: number, params: UserReviewsQueryParams = {}) {
  const { page = 0, size = 10, category = null, keyword = '' } = params
  const normalizedKeyword = keyword.trim()

  return useQuery({
    queryKey: ['user-reviews', userId, page, size, category, normalizedKeyword],
    queryFn: () =>
      reviewApi
        .getUserReviews(userId, {
          page,
          size,
          category: category ?? undefined,
          keyword: normalizedKeyword || undefined,
        })
        .then((res) => res.data.data!),
    enabled: !!userId,
    // 페이지/탭/검색 전환 시 이전 결과를 유지해 목록이 깜빡이지 않도록 한다.
    placeholderData: keepPreviousData,
  })
}

export function useUserReviewCategoryCounts(userId: number) {
  return useQuery({
    queryKey: ['user-review-category-counts', userId],
    queryFn: () => reviewApi.getUserReviewCategoryCounts(userId).then((res) => res.data.data!),
    enabled: !!userId,
  })
}
