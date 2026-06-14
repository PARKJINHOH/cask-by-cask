export type EventCategory = 'RELEASE' | 'FESTIVAL' | 'EVENT' | 'ETC'

/** 이벤트 등록 출처 */
export type EventSource = 'ADMIN' | 'USER'

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

/** 관리자용 이벤트 (노출 여부·출처·작성자 메타 포함) */
export interface AdminCalendarEvent extends CalendarEvent {
  isVisible: boolean
  source: EventSource
  createdById: number | null
  createdByNickname: string | null
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

/** 사용자 이벤트 제보 입력 (노출 여부 없음 — 항상 검토 대기로 등록) */
export interface SuggestEventPayload {
  title: string
  description?: string | null
  linkUrl?: string | null
  category: EventCategory
  startDate: string
  endDate?: string | null
}
