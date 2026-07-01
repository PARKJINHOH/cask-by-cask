import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminContentApi } from '../api/adminContentApi'
import type { ModerationPayload } from '../types/admin.types'

export function useAdminReviews(params: {
  spiritId?: number
  isHidden?: boolean
  page: number
}) {
  return useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () =>
      adminContentApi
        .listReviews({ ...params, size: 20 })
        .then((res) => res.data.data!),
  })
}

export function useHideAdminReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModerationPayload }) =>
      adminContentApi.hideReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail'] })
    },
  })
}

export function useUnhideAdminReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminContentApi.unhideReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail'] })
    },
  })
}

export function useDeleteAdminReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModerationPayload }) =>
      adminContentApi.deleteReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail'] })
    },
  })
}
