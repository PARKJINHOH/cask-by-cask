import { useQuery } from '@tanstack/react-query'
import { noticeApi } from '../api/noticeApi'
import type { NoticeCategory } from '../types/notice.types'

const QUERY_KEY = 'notices'

export function useNotices(params: {
  category?: NoticeCategory
  page?: number
  size?: number
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => noticeApi.list(params).then((r) => r.data.data!),
    // 공지는 자주 변경되지 않으므로 5분 캐시
    staleTime: 5 * 60 * 1000,
  })
}

// 최신 공지 1건 — GNB 미확인 배지용
export function useLatestNotice() {
  return useQuery({
    queryKey: [QUERY_KEY, 'latest'],
    queryFn: () =>
      noticeApi.list({ page: 0, size: 1 }).then((r) => r.data.data?.content[0] ?? null),
    staleTime: 5 * 60 * 1000,
  })
}
