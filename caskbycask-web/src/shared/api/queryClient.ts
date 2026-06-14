import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
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
