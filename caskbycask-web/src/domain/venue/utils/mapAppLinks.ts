import type { VenueDetail, VenueSummary } from '@/domain/venue/types/venue.types'

/**
 * 지도 앱 딥링크.
 *
 * <p>전부 <b>API 키가 필요 없는 공개 URL 스킴</b>이다 — 네이버·카카오·구글 어느 쪽도
 * 계정이나 키 발급 없이 링크만으로 동작한다. 이 기능의 "무료" 요구를 지키는 부분이다.
 *
 * <p>관리자가 검증해 저장해 둔 원본 URL 이 있으면 그것을 먼저 쓴다 — 이름·주소로 검색시키는
 * 것보다 정확하고, 동명의 다른 가게로 보내는 사고를 막는다.
 */

export interface MapAppLink {
  key: 'naver' | 'kakao' | 'google'
  label: string
  href: string
}

function searchQuery(venue: VenueSummary): string {
  // 이름만으로는 동명 업소가 많고, 주소만으로는 건물 전체가 잡힌다. 둘을 함께 넘긴다.
  return encodeURIComponent(`${venue.nameKo} ${venue.address}`.trim())
}

export function buildMapAppLinks(detail: VenueDetail): MapAppLink[] {
  const venue = detail.summary
  const query = searchQuery(venue)
  const hasCoordinates = venue.lat != null && venue.lng != null

  const googleHref =
    detail.googleMapsUrl ??
    (detail.googlePlaceId
      ? `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(detail.googlePlaceId)}`
      : hasCoordinates
        ? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${query}`)

  return [
    {
      key: 'naver',
      label: '네이버 지도',
      href: detail.naverMapsUrl ?? `https://map.naver.com/p/search/${query}`,
    },
    {
      key: 'kakao',
      label: '카카오맵',
      href: detail.kakaoMapsUrl ?? `https://map.kakao.com/link/search/${query}`,
    },
    { key: 'google', label: '구글 지도', href: googleHref },
  ]
}

/**
 * 길찾기 기본 링크 — 국내는 네이버, 해외는 구글.
 *
 * <p>OSM 기반 지도는 한국 안에서 상호·도로명이 빈약해 실제 길찾기에는 못 쓴다.
 * 그래서 "정확한 위치로 데려다주는 일"은 처음부터 지도 앱에 넘긴다.
 */
export function primaryDirectionsLink(detail: VenueDetail): MapAppLink {
  const links = buildMapAppLinks(detail)
  const preferred = detail.summary.countryCode === 'kr' ? 'naver' : 'google'
  return links.find((link) => link.key === preferred) ?? links[0]
}

/** `tel:` 은 공백·하이픈·괄호를 싫어한다. 표시는 원문 그대로 두고 링크만 정리한다. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
