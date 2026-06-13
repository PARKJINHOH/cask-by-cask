import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { NotificationItem, NotificationType, UnreadCountResponse } from '../types/notification.types'

export const notificationApi = {
  getUnreadCount: () =>
    axiosInstance.get<ApiResponse<UnreadCountResponse>>('/api/notifications/unread-count'),

  getNotifications: (params: { type?: NotificationType; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<NotificationItem>>>('/api/notifications', { params }),

  markRead: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/notifications/${id}/read`),

  markAllRead: () =>
    axiosInstance.patch<ApiResponse<null>>('/api/notifications/read-all'),
}
