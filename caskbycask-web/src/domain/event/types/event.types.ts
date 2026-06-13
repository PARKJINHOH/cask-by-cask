export type EventCategory = 'RELEASE' | 'FESTIVAL' | 'EVENT' | 'ETC'

/** 공개 조회용 이벤트 */
export interface CalendarEvent {
  id: number
  title: string
  description: string | null
  linkUrl: string | null
  category: EventCategory
  startDate: string        // 'YYYY-MM-DD'
  endDate: string | null   // null 이면 단일일
}

/** 관리자용 이벤트 (노출 여부·메타 포함) */
export interface AdminCalendarEvent extends CalendarEvent {
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

export interface EventPayload {
  title: string
  description?: string | null
  linkUrl?: string | null
  category: EventCategory
  startDate: string
  endDate?: string | null
  isVisible: boolean
}
