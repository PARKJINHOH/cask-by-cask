import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type QueryClient,
} from '@tanstack/react-query'
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

export const MY_REVIEWS_PAGE_SIZE = 10

export function useMyReviews(page = 0, category: SpiritCategory | null = null) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['my-reviews', page, category],
    queryFn: () =>
      reviewApi
        .getMyReviews({ page, size: MY_REVIEWS_PAGE_SIZE, category: category ?? undefined })
        .then((res) => res.data.data!),
    enabled: isAuthReady && isLoggedIn,
    // 페이지·카테고리 전환 시 이전 결과를 유지해 목록과 페이지네이션이 깜빡이지 않도록 한다.
    placeholderData: keepPreviousData,
  })
}

export function useMyReviewCategoryCounts() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['my-review-category-counts'],
    queryFn: () => reviewApi.getMyReviewCategoryCounts().then((res) => res.data.data!),
    enabled: isAuthReady && isLoggedIn,
  })
}

/** 리뷰 수정 페이지 진입용 단건 조회 — 새로고침·딥링크에도 동작하도록 서버에서 다시 읽는다. */
export function useMyReview(reviewId: number) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['my-review', reviewId],
    queryFn: () => reviewApi.getMyReview(reviewId).then((res) => res.data.data!),
    enabled: isAuthReady && isLoggedIn && Number.isFinite(reviewId) && reviewId > 0,
  })
}

export function useMyReviewRequests(
  page = 0,
  status?: VariantReviewRequestStatus,
  category: SpiritCategory | null = null,
) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['my-review-requests', page, status, category],
    queryFn: () =>
      reviewApi
        .getMyReviewRequests({
          page,
          size: MY_REVIEWS_PAGE_SIZE,
          status,
          category: category ?? undefined,
        })
        .then((res) => res.data.data!),
    enabled: isAuthReady && isLoggedIn,
    placeholderData: keepPreviousData,
  })
}

export function useMyReviewRequestCategoryCounts(status?: VariantReviewRequestStatus) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['my-review-request-category-counts', status],
    queryFn: () =>
      reviewApi.getMyReviewRequestCategoryCounts(status).then((res) => res.data.data!),
    enabled: isAuthReady && isLoggedIn,
  })
}

export function useMyReviewRequest(requestId: number) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['my-review-request', requestId],
    queryFn: () => reviewApi.getMyReviewRequest(requestId).then((res) => res.data.data!),
    enabled: isAuthReady && isLoggedIn && Number.isFinite(requestId) && requestId > 0,
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
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['my-review-category-counts'] })
    },
  })
}

/** 하위 에디션 요청 목록·카테고리 배지·단건 캐시를 함께 무효화한다. */
function invalidateMyReviewRequestQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['my-review-requests'] })
  queryClient.invalidateQueries({ queryKey: ['my-review-request'] })
  queryClient.invalidateQueries({ queryKey: ['my-review-request-category-counts'] })
}

export function useCreateVariantReviewRequest(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ data, images = [] }: { data: CreateVariantReviewRequest; images?: File[] }) =>
      reviewApi.createVariantReviewRequest(spiritId, data, images),
    onSuccess: () => {
      invalidateMyReviewRequestQueries(queryClient)
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
      invalidateMyReviewRequestQueries(queryClient)
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
      invalidateMyReviewRequestQueries(queryClient)
    },
  })
}

export function useDeleteMyReviewRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestId: number) => reviewApi.deleteMyReviewRequest(requestId),
    onSuccess: () => {
      invalidateMyReviewRequestQueries(queryClient)
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
      queryClient.invalidateQueries({ queryKey: ['my-review'] })
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] })
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
      queryClient.invalidateQueries({ queryKey: ['my-review-category-counts'] })
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
