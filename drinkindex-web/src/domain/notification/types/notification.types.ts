export type NotificationType = 'COMMENT' | 'REPLY' | 'MENTION' | 'LIKE' | 'MESSAGE' | 'SYSTEM'

export interface NotificationItem {
  id: number
  type: NotificationType
  message: string
  targetType: string | null
  targetId: number | null
  isRead: boolean
  createdAt: string
}

export interface UnreadCountResponse {
  count: number
}
