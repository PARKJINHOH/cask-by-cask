import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addFeedbackComment,
  createFeedback,
  deleteFeedback,
  getFeedbackDetail,
  getFeedbacks,
  updateFeedback,
  updateFeedbackStatus,
} from '../api/feedbackApi'
import type {
  CreateFeedbackData,
  FeedbackStatus,
  UpdateFeedbackData,
  UpdateFeedbackStatusData,
} from '../types/feedback.types'

export function useFeedbackList(params: { status?: FeedbackStatus; mine?: boolean; page?: number }) {
  return useQuery({
    queryKey: ['feedback', 'list', params],
    queryFn: () => getFeedbacks(params),
    staleTime: 30_000,
  })
}

export function useFeedbackDetail(id: number) {
  return useQuery({
    queryKey: ['feedback', id],
    queryFn: () => getFeedbackDetail(id),
    enabled: id > 0,
    staleTime: 15_000,
  })
}

export function useCreateFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, images }: { data: CreateFeedbackData; images: File[] }) =>
      createFeedback(data, images),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback', 'list'] }),
  })
}

export function useUpdateFeedback(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateFeedbackData) => updateFeedback(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback', id] })
      qc.invalidateQueries({ queryKey: ['feedback', 'list'] })
    },
  })
}

export function useDeleteFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteFeedback(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback', 'list'] }),
  })
}

export function useAddFeedbackComment(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => addFeedbackComment(id, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback', id] }),
  })
}

export function useUpdateFeedbackStatus(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateFeedbackStatusData) => updateFeedbackStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback', id] })
      qc.invalidateQueries({ queryKey: ['feedback', 'list'] })
    },
  })
}
