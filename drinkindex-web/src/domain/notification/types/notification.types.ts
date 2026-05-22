export type NotificationType = 'COMMENT' | 'REPLY' | 'MENTION' | 'LIKE' | 'MESSAGE' | 'SYSTEM' | 'BYOB_APPLY' | 'BYOB_APPROVE' | 'BYOB_REJECT' | 'BYOB_REMOVE'

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
