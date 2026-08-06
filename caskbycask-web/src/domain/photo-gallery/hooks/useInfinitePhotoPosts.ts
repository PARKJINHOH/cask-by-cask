import { useInfiniteQuery } from '@tanstack/react-query'
import { communityApi } from '@/domain/community/api/communityApi'
import type { PostListItem, PostSort } from '@/domain/community/types/community.types'

export interface PhotoPostQuery {
  keyword?: string
  sort?: PostSort
}

const PAGE_SIZE = 24

/**
 * 이미지 갤러리 무한 스크롤.
 *
 * ⚠️ maxPages 를 반드시 건다. queryClient 의 MutationCache 가 성공한 뮤테이션마다
 * invalidateQueries() 를 전역으로 호출하는데, React Query v5 는 무한 쿼리를 무효화할 때
 * **로드된 모든 페이지를 다시 요청**한다. 좋아요 한 번에 10페이지가 재요청되는 것을 막는다.
 */
export const useInfinitePhotoPosts = (query: PhotoPostQuery = {}) =>
  useInfiniteQuery({
    queryKey: ['photoGalleryPosts', query],
    initialPageParam: 0,
    maxPages: 5,
    queryFn: async ({ pageParam }) => {
      const res = await communityApi.getPosts({
        boardType: 'PHOTO',
        keyword: query.keyword || undefined,
        sort: query.sort,
        page: pageParam as number,
        size: PAGE_SIZE,
      })
      // ApiResponse<T> 는 data 가 null 일 수 있어 빈 페이지로 정규화한다.
      return res.data.data ?? { content: [], page: pageParam as number, size: PAGE_SIZE,
        totalElements: 0, totalPages: 0, last: true, empty: true }
    },
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    staleTime: 30_000,
  })

export const flattenPhotoPosts = (
  pages: ({ content: PostListItem[] } | null)[] | undefined,
): PostListItem[] => (pages ?? []).flatMap((page) => page?.content ?? [])
