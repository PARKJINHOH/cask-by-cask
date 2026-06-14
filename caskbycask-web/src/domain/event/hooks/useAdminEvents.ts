import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventApi } from '../api/eventApi'
import type { EventCategory, EventPayload } from '../types/event.types'

export function useAdminEvents(params: { year: number; month: number; category?: EventCategory }) {
  return useQuery({
    queryKey: ['admin-events', params.year, params.month, params.category ?? 'ALL'],
    queryFn: () => eventApi.getAdminEvents(params).then((r) => r.data.data ?? []),
    retry: false,
  })
}

/** 사용자 제보 목록(최근 제보순) */
export function useEventSuggestions() {
  return useQuery({
    queryKey: ['admin-event-suggestions'],
    queryFn: () => eventApi.getEventSuggestions().then((r) => r.data.data ?? []),
    retry: false,
  })
}

/** 관리자 변경 후 공개/관리자/제보 캐시 모두 무효화 */
function useInvalidateEvents() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin-events'] })
    qc.invalidateQueries({ queryKey: ['admin-event-suggestions'] })
    qc.invalidateQueries({ queryKey: ['events'] })
  }
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: (data: EventPayload) => eventApi.createEvent(data).then((r) => r.data.data),
    onSuccess: invalidate,
  })
}

export function useUpdateEvent() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EventPayload }) =>
      eventApi.updateEvent(id, data).then((r) => r.data.data),
    onSuccess: invalidate,
  })
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: (id: number) => eventApi.deleteEvent(id).then((r) => r.data.data),
    onSuccess: invalidate,
  })
}
