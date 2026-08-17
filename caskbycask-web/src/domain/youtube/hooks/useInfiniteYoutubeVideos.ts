import { useInfiniteQuery } from '@tanstack/react-query'
import { youtubeApi } from '../api/youtubeApi'
import type { YoutubeVideo, YoutubeVideoQuery } from '../types/youtube.types'

const PAGE_SIZE = 24

/**
 * 유튜브 갤러리 무한 스크롤.
 *
 * 이미지 갤러리(`useInfinitePhotoPosts`)와 같은 이유로 `meta.skipGlobalInvalidate` 를 단다 —
 * React Query v5 는 무한 쿼리를 무효화할 때 **로드된 모든 페이지를 다시 요청**하므로,
 * 아무 뮤테이션 하나에 수백 건을 재요청하게 된다. 갤러리 갱신이 필요한 화면(관리자 등)은
 * `['youtubeVideos']` 를 직접 무효화한다.
 */
export const useInfiniteYoutubeVideos = (query: YoutubeVideoQuery = {}) =>
  useInfiniteQuery({
    queryKey: ['youtubeVideos', query],
    initialPageParam: 0,
    maxPages: 10,
    meta: { skipGlobalInvalidate: true },
    queryFn: ({ pageParam }) => youtubeApi.getVideos({
      ...query,
      page: pageParam as number,
      size: PAGE_SIZE,
    }),
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    // 영상은 3시간마다 수집되므로 굳이 자주 다시 묻지 않는다.
    staleTime: 5 * 60_000,
  })

export const flattenYoutubeVideos = (
  pages: ({ content: YoutubeVideo[] } | null)[] | undefined,
): YoutubeVideo[] => (pages ?? []).flatMap((page) => page?.content ?? [])
