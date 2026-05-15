import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communityApi } from '../api/communityApi'

export function useEmojis() {
  return useQuery({
    queryKey: ['emojis'],
    queryFn: () => communityApi.getEmojis().then((r) => r.data.data ?? []),
    staleTime: 10 * 60_000, // 10분 — 자주 변경 안 됨
  })
}

export function useToggleReaction(commentId: number, postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (emojiId: number) => communityApi.toggleReaction(commentId, emojiId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', postId] }),
  })
}
