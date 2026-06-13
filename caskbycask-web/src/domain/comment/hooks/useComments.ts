import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commentApi } from '../api/commentApi'
import type { CreateCommentRequest, UpdateCommentRequest } from '../types/comment.types'

export function useComments(spiritId: number, page = 0) {
  return useQuery({
    queryKey: ['comments', spiritId, page],
    queryFn: () =>
      commentApi.getComments(spiritId, { page, size: 20 }).then((res) => res.data.data!),
  })
}

export function useCreateComment(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCommentRequest) => commentApi.createComment(spiritId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', spiritId] })
    },
  })
}

export function useUpdateComment(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: number; data: UpdateCommentRequest }) =>
      commentApi.updateComment(spiritId, commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', spiritId] })
    },
  })
}

export function useDeleteComment(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => commentApi.deleteComment(spiritId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', spiritId] })
    },
  })
}

export function useToggleLike(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => commentApi.toggleLike(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', spiritId] })
    },
  })
}
