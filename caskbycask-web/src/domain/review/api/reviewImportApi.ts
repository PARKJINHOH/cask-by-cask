import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'

/** 링크로 원문을 읽어 오는 대상 — 비로그인으로 열리는 공개 게시판만 지원한다. */
export type ReviewSourceSite = 'DCINSIDE' | 'ARCALIVE'

export interface ReviewImportFetchResult {
  sourceSite: ReviewSourceSite
  title: string
  content: string
  /** 서버가 식별자로 다시 조립한 주소 — 사용자가 넣은 문자열 그대로가 아니다. */
  canonicalUrl: string
}

export const reviewImportApi = {
  /**
   * 공개 게시글 본문을 텍스트로만 받아 온다. 서버는 아무것도 저장하지 않는다.
   * 파싱은 프론트의 `reviewImportParser` 가 하므로 규칙이 한 곳에만 있다.
   */
  fetch: (url: string) =>
    axiosInstance.post<ApiResponse<ReviewImportFetchResult>>('/api/review-imports/fetch', { url }),
}
