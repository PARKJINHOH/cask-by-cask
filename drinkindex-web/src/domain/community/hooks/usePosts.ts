import { useQuery } from '@tanstack/react-query'
import { communityApi } from '../api/communityApi'
import type { BoardType, PostSort } from '../types/community.types'

export function usePosts(params: {
  boardType: BoardType
  prefixId?: number
  keyword?: string
  sort?: PostSort
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
