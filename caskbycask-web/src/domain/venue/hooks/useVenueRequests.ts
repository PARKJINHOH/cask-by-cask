import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminVenueRequestApi, venueRequestApi } from '@/domain/venue/api/venueRequestApi'
import type { VenueRequestBody, VenueRequestStatus } from '@/domain/venue/types/venue.types'

export function useMyVenueRequests(enabled = true) {
  return useQuery({
    queryKey: ['venue-requests', 'me'],
    queryFn: () => venueRequestApi.myRequests().then((r) => r.data.data ?? []),
    enabled,
    retry: false,
  })
}

export function useSubmitVenueRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: VenueRequestBody) => venueRequestApi.submit(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['venue-requests', 'me'] }),
  })
}

// ── 관리자 ────────────────────────────────────────────────

export function useAdminVenueRequests(status: VenueRequestStatus | '', page: number) {
  return useQuery({
    queryKey: ['admin-venue-requests', status, page],
    queryFn: () =>
      adminVenueRequestApi
        .list({ status: status || undefined, page, size: 20 })
        .then((r) => r.data.data!),
  })
}

/** 승인·거절은 목록과 장소 목록을 함께 버린다 — 승인은 새 장소를 만들기 때문이다. */
function invalidateRequests(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin-venue-requests'] })
  qc.invalidateQueries({ queryKey: ['admin-venues'] })
  qc.invalidateQueries({ queryKey: ['venues'] })
  qc.invalidateQueries({ queryKey: ['venue-countries'] })
}

export function useApproveVenueRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, venueCityId }: { id: number; venueCityId: number }) =>
      adminVenueRequestApi.approve(id, venueCityId),
    onSuccess: () => invalidateRequests(qc),
  })
}

export function useRejectVenueRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) =>
      adminVenueRequestApi.reject(id, rejectReason),
    onSuccess: () => invalidateRequests(qc),
  })
}
