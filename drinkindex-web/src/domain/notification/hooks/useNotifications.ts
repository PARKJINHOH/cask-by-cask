import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { notificationApi } from '../api/notificationApi'
import type { NotificationType } from '../types/notification.types'

const PAGE_SIZE = 20

// 전체 알림 페이지용 (버튼 페이지네이션)
export function useNotificationsPage(type: NotificationType | undefined, page: number) {
  return useQuery({
    queryKey: ['notifications', 'page', type, page],
    queryFn: () =>
      notificationApi
        .getNotifications({ type, page, size: PAGE_SIZE })
        .then((r) => r.data.data!),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })
}

// 헤더 드롭다운용 (최근 10개, 단순 쿼리)
export function useRecentNotifications(type?: NotificationType) {
  return useQuery({
    queryKey: ['notifications', 'recent', type],
    queryFn: () =>
      notificationApi
        .getNotifications({ type, page: 0, size: 10 })
        .then((r) => r.data.data?.content ?? []),
    staleTime: 10_000,
  })
}
