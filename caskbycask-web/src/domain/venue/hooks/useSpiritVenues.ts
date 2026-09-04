import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { SpiritVenue } from '@/domain/venue/types/venue.types'

/**
 * 이 술을 마실 수 있는 곳.
 *
 * 기능 플래그가 꺼져 있으면 서버가 404 를 준다 — 그때 화면은 섹션을 아예 그리지 않는다.
 * 그래서 실패를 재시도하지 않는다(없는 기능을 세 번 더 물어볼 이유가 없다).
 */
export function useSpiritVenues(spiritId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['spirit-venues', spiritId],
    queryFn: () =>
      axiosInstance
        .get<ApiResponse<SpiritVenue[]>>(`/api/spirits/${spiritId}/venues`)
        .then((r) => r.data.data ?? []),
    enabled: enabled && spiritId != null,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
