import { useInfiniteQuery } from '@tanstack/react-query'
import { communityApi } from '@/domain/community/api/communityApi'
import type { PostListItem, PostSort } from '@/domain/community/types/community.types'

export interface PhotoPostQuery {
  keyword?: string
  sort?: PostSort
  /** 주류 태그 필터 — 이 주류가 태그된 사진만 본다. */
  spiritTagId?: number
}

const PAGE_SIZE = 24

/**
 * 이미지 갤러리 무한 스크롤.
 *
 * `meta.skipGlobalInvalidate` 로 전역 무효화에서 빠져 있다. queryClient 의 MutationCache 는
 * 성공한 뮤테이션마다 invalidateQueries() 를 부르는데, React Query v5 는 무한 쿼리를 무효화할 때
 * **로드된 모든 페이지를 다시 요청**한다. 좋아요 한 번에 수백 장을 재요청하게 되므로 제외한다.
 * 사진이 늘거나 줄었을 때의 갱신은 각 화면이 ['photoGalleryPosts'] 를 직접 무효화한다
 * (PhotoUploadDialog 참고).
 */
export const useInfinitePhotoPosts = (query: PhotoPostQuery = {}) =>
  useInfiniteQuery({
    queryKey: ['photoGalleryPosts', query],
    initialPageParam: 0,
    // 전역 무효화에서 빠졌으므로 상한을 넉넉히 둘 수 있다. 그래도 메모리 상한은 남긴다
    // (여기를 지우면 오래 스크롤한 탭이 수백 장의 목록을 계속 들고 있게 된다).
    maxPages: 10,
    meta: { skipGlobalInvalidate: true },
    queryFn: async ({ pageParam }) => {
      const res = await communityApi.getPosts({
        boardType: 'PHOTO',
        keyword: query.keyword || undefined,
        sort: query.sort,
        spiritTagId: query.spiritTagId,
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
