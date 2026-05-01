import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commentApi } from '../api/commentApi'
import type { CreateCommentRequest } from '../types/comment.types'

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

export function useToggleLike(spiritId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => commentApi.toggleLike(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', spiritId] })
    },
  })
}
