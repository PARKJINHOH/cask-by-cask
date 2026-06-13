import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  CalendarEvent,
  AdminCalendarEvent,
  EventPayload,
  EventCategory,
} from '../types/event.types'

export const eventApi = {
  // ── 공개 ──────────────────────────────────────────────────
  getEvents: (year: number, month: number) =>
    axiosInstance.get<ApiResponse<CalendarEvent[]>>('/api/events', {
      params: { year, month },
    }),

  getUpcomingEvents: (limit = 10) =>
    axiosInstance.get<ApiResponse<CalendarEvent[]>>('/api/events/upcoming', {
      params: { limit },
    }),

  // ── 관리자 ────────────────────────────────────────────────
  getAdminEvents: (params: { year: number; month: number; category?: EventCategory }) =>
    axiosInstance.get<ApiResponse<AdminCalendarEvent[]>>('/api/admin/events', { params }),

  getAdminEventDetail: (id: number) =>
    axiosInstance.get<ApiResponse<AdminCalendarEvent>>(`/api/admin/events/${id}`),

  createEvent: (data: EventPayload) =>
    axiosInstance.post<ApiResponse<AdminCalendarEvent>>('/api/admin/events', data),

  updateEvent: (id: number, data: EventPayload) =>
    axiosInstance.patch<ApiResponse<AdminCalendarEvent>>(`/api/admin/events/${id}`, data),

  deleteEvent: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/events/${id}`),

  updateVisibility: (id: number, isVisible: boolean) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/events/${id}/visibility`, { isVisible }),
}
