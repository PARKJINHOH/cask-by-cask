import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewApi } from '../api/reviewApi'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { CreateReviewRequest, UpdateReviewRequest } from '../types/review.types'

export function useReviews(spiritId: number, page = 0) {
  return useQuery({
    queryKey: ['reviews', spiritId, page],
    queryFn: () =>
      reviewApi.getReviews(spiritId, { page, size: 10 }).then((res) => res.data.data!),
  })
}

export function useMyReviews(page = 0) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: ['my-reviews', page],
    queryFn: () => reviewApi.getMyReviews({ page, size: 10 }).then((res) => res.data.data!),
    enabled: isLoggedIn,
  })
}

export function useCreateReview(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateReviewRequest) => reviewApi.createReview(spiritId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', spiritId] })
      queryClient.invalidateQueries({ queryKey: ['spirit', spiritId] })
    },
  })
}

export function useUpdateReview(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: number; data: UpdateReviewRequest }) =>
      reviewApi.updateReview(spiritId, reviewId, data),
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
    },
  })
}
