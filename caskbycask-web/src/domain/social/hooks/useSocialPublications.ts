import { useQuery } from '@tanstack/react-query'
import { socialApi } from '../api/socialApi'
import type { SocialPublication, SocialSourceType } from '../types/social.types'

/** 실제로 열어 볼 수 있는 게시글만 링크한다 — 외부에서 지워진 글은 permalink 가 남아 있어도 제외한다. */
export function isOpenablePublication(publication: SocialPublication): boolean {
  return publication.status === 'PUBLISHED' && !!publication.permalink
}

/**
 * 목록 화면에서 원본 여러 건의 SNS 게시 상태를 한 번에 읽는다.
 *
 * 예) 마이페이지 "내 리뷰" 한 페이지의 리뷰 ID 를 넘기면 리뷰별 인스타·스레드 게시 상태를 돌려준다.
 * 조회는 페이지당 한 번이며, ID 목록이 비면 요청 자체를 보내지 않는다.
 */
export function useSourceSocialPublications(sourceType: SocialSourceType, sourceIds: number[]) {
  // 순서가 바뀌었다고 다시 받지 않도록 정렬한 값을 키로 쓴다.
  const ids = [...new Set(sourceIds)].sort((a, b) => a - b)

  return useQuery({
    queryKey: ['social-publications', 'sources', sourceType, ids],
    queryFn: () => socialApi.sourcesStates(sourceType, ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  })
}
