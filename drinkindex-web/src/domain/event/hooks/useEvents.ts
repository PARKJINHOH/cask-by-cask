import { useQuery } from '@tanstack/react-query'
import { eventApi } from '../api/eventApi'

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
