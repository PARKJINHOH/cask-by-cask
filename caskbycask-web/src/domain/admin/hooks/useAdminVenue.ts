import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminVenueApi } from '../api/adminVenueApi'
import type {
  VenueCityUpsertPayload,
  VenueStatus,
  VenueType,
  VenueUpsertPayload,
} from '@/domain/venue/types/venue.types'

export interface VenueFilters {
  keyword?: string
  countryCode?: string
  cityId?: string
  venueType?: VenueType | ''
  status?: VenueStatus | ''
}

/**
 * 장소를 고치면 공개 조회 캐시도 함께 버린다.
 * 관리자가 좌표를 옮겼는데 지도 화면이 옛 위치를 계속 보여주면 "저장이 안 됐다"로 읽힌다.
 */
function invalidateVenueQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin-venues'] })
  qc.invalidateQueries({ queryKey: ['admin-venue-cities'] })
  qc.invalidateQueries({ queryKey: ['venues'] })
  qc.invalidateQueries({ queryKey: ['venue-countries'] })
}

export function useAdminVenues(filters: VenueFilters, page: number, sort = 'nameKo,asc') {
  return useQuery({
    queryKey: ['admin-venues', filters, page, sort],
    queryFn: () =>
      adminVenueApi
        .list({
          keyword: filters.keyword?.trim() || undefined,
          countryCode: filters.countryCode?.trim() || undefined,
          cityId: filters.cityId?.trim() ? Number(filters.cityId) : undefined,
          venueType: filters.venueType || undefined,
          status: filters.status || undefined,
          page,
          size: 20,
          sort,
        })
        .then((r) => r.data.data!),
  })
}

export function useAdminVenue(id: number | null) {
  return useQuery({
    queryKey: ['admin-venues', 'detail', id],
    queryFn: () => adminVenueApi.detail(id!).then((r) => r.data.data!),
    enabled: id != null,
  })
}

/**
 * 공유 링크 → 좌표.
 *
 * 캐시를 건드리지 않는다 — 폼 입력을 돕는 일회성 조회이지 저장이 아니다.
 */
export function useResolveVenueLink() {
  return useMutation({
    mutationFn: (data: { link: string; addressHint?: string }) =>
      adminVenueApi.resolveLink(data).then((r) => r.data.data!),
  })
}

export function useCreateVenue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: VenueUpsertPayload) => adminVenueApi.create(data),
    onSuccess: () => invalidateVenueQueries(qc),
  })
}

export function useUpdateVenue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VenueUpsertPayload }) =>
      adminVenueApi.update(id, data),
    onSuccess: () => invalidateVenueQueries(qc),
  })
}

export function useDeleteVenue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminVenueApi.delete(id),
    onSuccess: () => invalidateVenueQueries(qc),
  })
}

// ── 도시 ────────────────────────────────────────────────

/**
 * 도시 목록은 장소 등록 폼의 셀렉트에도 쓰이므로 자주 읽힌다.
 * 자주 바뀌지 않는 카탈로그라 staleTime 을 넉넉히 준다.
 */
export function useAdminVenueCities() {
  return useQuery({
    queryKey: ['admin-venue-cities'],
    queryFn: () => adminVenueApi.listCities().then((r) => r.data.data!),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateVenueCity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: VenueCityUpsertPayload) => adminVenueApi.createCity(data),
    onSuccess: () => invalidateVenueQueries(qc),
  })
}

export function useUpdateVenueCity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VenueCityUpsertPayload }) =>
      adminVenueApi.updateCity(id, data),
    onSuccess: () => invalidateVenueQueries(qc),
  })
}

export function useDeleteVenueCity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminVenueApi.deleteCity(id),
    onSuccess: () => invalidateVenueQueries(qc),
  })
}
