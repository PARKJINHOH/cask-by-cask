import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewApi } from '../api/reviewApi'
import type { CreateReviewRequest } from '../types/review.types'

export function useReviews(spiritId: number, page = 0) {
  return useQuery({
    queryKey: ['reviews', spiritId, page],
    queryFn: () =>
      reviewApi.getReviews(spiritId, { page, size: 10 }).then((res) => res.data.data!),
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
