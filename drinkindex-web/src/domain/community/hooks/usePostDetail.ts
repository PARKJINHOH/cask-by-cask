import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communityApi } from '../api/communityApi'

export function usePostDetail(id: number) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => communityApi.getPost(id).then((r) => r.data.data!),
    staleTime: 0, // 상세는 항상 최신 (조회수 반영)
    enabled: id > 0,
  })
}

export function usePoll(pollId: number, enabled = true) {
  return useQuery({
    queryKey: ['poll', pollId],
    queryFn: () => communityApi.getPoll(pollId).then((r) => r.data.data!),
    staleTime: 0,
    enabled: enabled && pollId > 0,
  })
}

export function usePostActions(postId: number) {
  const qc = useQueryClient()

  const invalidate = () => qc.invalidateQueries({ queryKey: ['post', postId] })

  const likeMutation = useMutation({
    mutationFn: (isLike: boolean) => communityApi.likePost(postId, isLike),
    onSuccess: invalidate,
  })

  const scrapMutation = useMutation({
    mutationFn: () => communityApi.scrapPost(postId),
    onSuccess: invalidate,
  })

  const reportMutation = useMutation({
    mutationFn: (reason?: string) => communityApi.reportPost(postId, reason),
  })

  const deleteMutation = useMutation({
    mutationFn: () => communityApi.deletePost(postId),
  })

  const blockMutation = useMutation({
    mutationFn: (userId: number) => communityApi.toggleBlock(userId),
    onSuccess: invalidate,
  })

  const voteMutation = useMutation({
    mutationFn: (optionIds: number[]) => communityApi.vote(postId, optionIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['poll', postId] })
      invalidate()
    },
  })

  return { likeMutation, scrapMutation, reportMutation, deleteMutation, blockMutation, voteMutation }
}
