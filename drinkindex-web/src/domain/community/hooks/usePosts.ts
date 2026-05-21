import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communityApi } from '../api/communityApi'
import type { BoardType, PostSort } from '../types/community.types'
import { useAuthStore } from '@/domain/auth/store/authStore'

export function usePosts(params: {
  boardType: BoardType
  prefixId?: number
  keyword?: string
  sort?: PostSort
  authorId?: number
  commentAuthorId?: number
  page?: number
  size?: number
}) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => communityApi.getPosts(params).then((r) => r.data.data!),
    staleTime: 30_000,
  })
}

export function useBestPosts(params: {
  boardType: BoardType
  page?: number
  size?: number
}) {
  return useQuery({
    queryKey: ['posts', 'best', params],
    queryFn: () => communityApi.getBestPosts(params).then((r) => r.data.data!),
    staleTime: 30_000,
  })
}

export function usePostPrefixes(boardType: BoardType) {
  return useQuery({
    queryKey: ['post-prefixes', boardType],
    queryFn: () => communityApi.getPrefixes(boardType).then((r) => r.data.data ?? []),
    staleTime: 5 * 60_000, // 5분 — 말머리는 자주 변경 안 됨
  })
}

export function useMyScrappedPosts(page = 0, size = 20) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: ['posts', 'me', 'scraps', page, size],
    queryFn: () => communityApi.getMyScrappedPosts({ page, size }).then((r) => r.data.data!),
    enabled: isLoggedIn,
  })
}

export function useUnscrapPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: number) => communityApi.scrapPost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'me', 'scraps'] })
    },
  })
}
