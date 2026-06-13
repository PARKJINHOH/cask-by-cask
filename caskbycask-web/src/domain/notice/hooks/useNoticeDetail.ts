import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { noticeApi } from '../api/noticeApi'
import type { NoticeDetail } from '../types/notice.types'

export function useNoticeDetail(id: number | null) {
  return useQuery({
    queryKey: ['notices', 'detail', id],
    queryFn: () => noticeApi.getDetail(id!).then((r) => r.data.data!),
    enabled: id != null,
    staleTime: 5 * 60 * 1000,
  })
}

export function useToggleNoticeRecommend(id: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => noticeApi.toggleRecommend(id!).then((r) => r.data.data!),
    onSuccess: (result) => {
      // 상세 캐시 즉시 반영
      queryClient.setQueryData<NoticeDetail>(['notices', 'detail', id], (prev) =>
        prev
          ? { ...prev, isRecommended: result.recommended, recommendCount: result.recommendCount }
          : prev,
      )
      // 목록만 갱신 (상세는 setQueryData로 반영 — 재조회 시 viewCount 중복 증가 방지)
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'notices' && q.queryKey[1] !== 'detail',
      })
    },
  })
}
