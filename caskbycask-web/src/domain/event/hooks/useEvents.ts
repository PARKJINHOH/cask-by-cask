import { useMutation, useQuery } from '@tanstack/react-query'
import { eventApi } from '../api/eventApi'
import type { SuggestEventPayload } from '../types/event.types'

/** 공개: 특정 연·월 이벤트 달력 */
export function useEvents(year: number, month: number) {
  return useQuery({
    queryKey: ['events', year, month],
    queryFn: () => eventApi.getEvents(year, month).then((r) => r.data.data ?? []),
    staleTime: 60_000,
    retry: false,
  })
}

/** 공개: 오늘 기준 진행 중 + 다가오는 이벤트 (사이드바 목록용) */
export function useUpcomingEvents(limit = 10) {
  return useQuery({
    queryKey: ['events', 'upcoming', limit],
    queryFn: () => eventApi.getUpcomingEvents(limit).then((r) => r.data.data ?? []),
    staleTime: 60_000,
    retry: false,
  })
}

/** 로그인 사용자 이벤트 제보 (검토 대기로 등록 — 공개 캐시 무효화 불필요) */
export function useSuggestEvent() {
  return useMutation({
    mutationFn: (data: SuggestEventPayload) =>
      eventApi.suggestEvent(data).then((r) => r.data.data),
  })
}
