import type { VenueStatus, VenueType } from '@/domain/venue/types/venue.types'

/**
 * 장소 유형·상태의 i18n 키.
 *
 * <p>사용자 화면은 ko/en 양쪽이 필요하고, 관리자 화면은 한국어 고정이라
 * {@code VENUE_TYPE_LABEL_KO} 를 그대로 쓴다. 두 경로를 섞지 않으려고 키 생성만 여기 모은다.
 *
 * <p>이 파일은 순수 함수만 둔다 — 서버 렌더 경로에서도 import 될 수 있다.
 */
export function venueTypeLabelKey(type: VenueType): string {
  return `venue.type.${type}`
}

export function venueStatusLabelKey(status: VenueStatus): string {
  return `venue.status.${status}`
}

/**
 * 국가 코드 → i18n 키. 국가명은 이미 iso3166Countries 카탈로그에 있지만,
 * 장소 화면에서 쓰는 국가는 소수라 번역 키로 두는 편이 로케일 전환에 안전하다.
 */
export function venueCountryLabelKey(countryCode: string): string {
  return `venue.country.${countryCode.toLowerCase()}`
}
