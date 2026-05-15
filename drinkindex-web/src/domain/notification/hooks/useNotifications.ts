import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { notificationApi } from '../api/notificationApi'
import type { NotificationType } from '../types/notification.types'

const PAGE_SIZE = 20

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

// 전체 알림 페이지용 (무한 스크롤)
export function useInfiniteNotifications(type?: NotificationType) {
  return useInfiniteQuery({
    queryKey: ['notifications', 'infinite', type],
    queryFn: ({ pageParam }) =>
      notificationApi
        .getNotifications({ type, page: pageParam as number, size: PAGE_SIZE })
        .then((r) => r.data.data!),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
  })
}
