import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '../api/notificationApi'
import { useAuthStore } from '@/domain/auth/store/authStore'

// 현재: 30초 폴링 방식
// 추후 롱폴링 전환 시:
//   - queryFn을 fetch + AbortController 패턴으로 교체
//   - 서버: GET /api/notifications/unread-count → DeferredResult<ResponseBodyEmitter>
//   - refetchInterval 제거, 서버 SSE/롱폴링이 자체 타임아웃 후 재연결
const POLL_INTERVAL = 30_000 // NotificationConstants.NOTIFICATION_POLL_INTERVAL_SECONDS × 1000

export function useNotificationPolling() {
  const { isLoggedIn } = useAuthStore()

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      notificationApi.getUnreadCount().then((r) => r.data.data?.count ?? 0),
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false, // 탭 비활성 시 폴링 중단 (불필요한 서버 부하 방지)
    staleTime: POLL_INTERVAL,
    enabled: isLoggedIn,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return {
    markRead: async (id: number) => {
      await notificationApi.markRead(id)
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    markAllRead: async () => {
      await notificationApi.markAllRead()
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  }
}
