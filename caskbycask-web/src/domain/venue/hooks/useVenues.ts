import { useQuery } from '@tanstack/react-query'
import { venueApi } from '@/domain/venue/api/venueApi'

/** 카탈로그성 데이터라 자주 안 바뀐다 — 도시를 오갈 때마다 다시 받지 않도록 넉넉히 준다. */
const CATALOG_STALE_MS = 5 * 60 * 1000

export function useVenueCountries() {
  return useQuery({
    queryKey: ['venue-countries'],
    queryFn: () => venueApi.countries().then((r) => r.data.data!),
    staleTime: CATALOG_STALE_MS,
  })
}

/**
 * 도시 하나 + 장소 전부.
 *
 * 지도는 중심 좌표·줌(city)과 마커 목록(venues)이 <b>동시에</b> 있어야 첫 프레임을 그린다.
 * 둘을 따로 부르면 세계 뷰에서 한 번 그려진 뒤 도시로 튀는 것이 눈에 보인다.
 */
export function useVenueCity(countryCode: string | null, slug: string | null) {
  return useQuery({
    queryKey: ['venues', 'city', countryCode, slug],
    queryFn: () => venueApi.city(countryCode!, slug!).then((r) => r.data.data!),
    enabled: !!countryCode && !!slug,
    staleTime: CATALOG_STALE_MS,
  })
}

/**
 * 장소 상세.
 *
 * 목록에서 이미 받아 둔 요약이 있으면 화면은 그것으로 먼저 그리고, 이 훅은 연락처·영업시간처럼
 * 목록에 없는 필드만 채운다(패널이 열릴 때 깜빡이지 않게).
 */
export function useVenueDetail(venueId: number | null) {
  return useQuery({
    queryKey: ['venues', 'detail', venueId],
    queryFn: () => venueApi.detail(venueId!).then((r) => r.data.data!),
    enabled: venueId != null,
    staleTime: CATALOG_STALE_MS,
  })
}
