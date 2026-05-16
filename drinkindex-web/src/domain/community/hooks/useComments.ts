import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communityApi } from '../api/communityApi'

const COMMENT_KEY = (postId: number) => ['comments', postId]

export function useComments(postId: number, page = 0, size = 30) {
  return useQuery({
    queryKey: [...COMMENT_KEY(postId), page],
    queryFn: () => communityApi.getComments(postId, { page, size }).then((r) => r.data.data!),
    staleTime: 15_000,
    enabled: postId > 0,
  })
}

export function useCreateComment(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { content: string; parentId?: number; mentionedUserId?: number }) =>
      communityApi.createComment(postId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMMENT_KEY(postId) })
      qc.invalidateQueries({ queryKey: ['post', postId] }) // commentCount 갱신
    },
  })
}

export function useUpdateComment(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      communityApi.updateComment(postId, commentId, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMMENT_KEY(postId) }),
  })
}

export function useDeleteComment(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => communityApi.deleteComment(postId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMMENT_KEY(postId) })
      qc.invalidateQueries({ queryKey: ['post', postId] }) // commentCount 갱신
    },
  })
}
