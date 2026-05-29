export type NoticeCategory = 'GENERAL' | 'UPDATE' | 'EVENT' | 'MAINTENANCE'

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  GENERAL: '일반',
  UPDATE: '업데이트',
  EVENT: '이벤트',
  MAINTENANCE: '점검',
}

export interface NoticeImageItem {
  id: number
  imageUrl: string
  originalFileName: string
  fileSize: number
  mimeType: string
}

export interface NoticeListItem {
  id: number
  title: string
  category: NoticeCategory
  isPinned: boolean
  isPublished: boolean
  viewCount: number
  recommendCount: number
  isRecommended: boolean
  createdAt: string
}

export interface NoticeDetail {
  id: number
  title: string
  contentSanitized: string
  category: NoticeCategory
  isPinned: boolean
  viewCount: number
  recommendCount: number
  isRecommended: boolean
  images: NoticeImageItem[]
  createdAt: string
  updatedAt: string
}

export interface NoticeRecommendResult {
  recommended: boolean
  recommendCount: number
}

// 관리자 전용: 편집용 원본 content 포함
export interface NoticeAdminDetail {
  id: number
  title: string
  content: string
  contentSanitized: string
  category: NoticeCategory
  isPinned: boolean
  isPublished: boolean
  viewCount: number
  images: NoticeImageItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateNoticePayload {
  title: string
  content: string
  category?: NoticeCategory
  isPinned?: boolean
  isPublished?: boolean
}

export interface UpdateNoticePayload {
  title?: string
  content?: string
  category?: NoticeCategory
  isPinned?: boolean
  isPublished?: boolean
}

export interface UploadedNoticeImage {
  id: number
  imageUrl: string
  originalFileName: string
  fileSize: number
  mimeType: string
}
