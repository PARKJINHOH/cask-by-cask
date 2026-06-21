import { QueryClient, MutationCache } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  // [캐시 일관성] 어떤 mutation 이든 성공하면 모든 쿼리를 무효화한다.
  // staleTime(60초) 때문에 수정/저장 후에도 화면이 옛 캐시를 보여주던 문제를 단일 지점에서 해결.
  // (특히 관리자 술/게시글 등 수정 후 같은 화면·사용자 공개 화면이 자동 갱신됨)
  // invalidateQueries 는 "활성(마운트된) 쿼리만 즉시 refetch" 하고 나머지는 stale 로만 표시하므로
  // 실제 재요청 부하는 현재 화면에 떠 있는 쿼리로 한정된다.
  // 특정 mutation 이 더 정교한 무효화를 하더라도 각 훅의 onSuccess 와 함께 추가로 실행되어 무해하다.
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  }),
  defaultOptions: {
    queries: {
      // 전역 기본 60초. 과거엔 0이라 staleTime 미지정 쿼리가 탭 복귀(refetchOnWindowFocus)마다
      // 전부 재요청 → 불필요한 서버 부하/깜빡임이 발생했다.
      // 실시간성이 필요한 쿼리는 각 훅에서 staleTime: 0 으로 개별 override 한다
      // (예: usePostDetail 조회수, useMessages 미읽음, 관리자 상세/문의 등).
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
