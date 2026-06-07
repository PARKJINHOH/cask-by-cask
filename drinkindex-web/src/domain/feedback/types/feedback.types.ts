export type FeedbackType = 'BUG' | 'IMPROVEMENT' | 'FEATURE' | 'ETC'

export type FeedbackStatus =
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'ON_HOLD'

export const FEEDBACK_TYPES: FeedbackType[] = ['BUG', 'IMPROVEMENT', 'FEATURE', 'ETC']
export const FEEDBACK_STATUSES: FeedbackStatus[] = [
  'RECEIVED',
  'CONFIRMED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
  'ON_HOLD',
]

export interface FeedbackListItem {
  id: number
  type: FeedbackType
  title: string
  status: FeedbackStatus
  progress: number
  commentCount: number
  hasImages: boolean
  authorNickname: string | null
  createdAt: string
  updatedAt: string
}

export interface FeedbackComment {
  id: number
  content: string
  isAdminReply: boolean
  isMine: boolean
  authorNickname: string | null
  createdAt: string
}

export interface FeedbackDetail {
  id: number
  type: FeedbackType
  title: string
  content: string
  imageUrls: string[]
  status: FeedbackStatus
  progress: number
  commentCount: number
  editable: boolean
  authorNickname: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  comments: FeedbackComment[]
}

export interface CreateFeedbackData {
  type: FeedbackType
  title: string
  content: string
}

export interface UpdateFeedbackData {
  type: FeedbackType
  title: string
  content: string
}

export interface UpdateFeedbackStatusData {
  status: FeedbackStatus
  progress: number | null
}
