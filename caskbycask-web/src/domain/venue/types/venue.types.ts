// 주류 장소(바·몰트바·보틀샵·면세점) 타입.
//
// ⚠️ 이 파일은 서버 렌더 경로(seoHelpers.ts / SeoFallback.tsx)에서도 import 된다.
//    타입과 순수 상수만 둘 것 — maplibre-gl 은 import 시점에 window 를 만지므로
//    이 파일이 직접이든 간접이든 지도 컴포넌트를 끌어오면 SSR 이 깨진다.

/**
 * 장소 유형. 서버 enum 과 짝을 이룬다.
 *
 * 일부러 셋만 둔다 — 유형은 "거기서 무엇을 할 수 있는가"를 나눠야 필터가 쓸모 있다.
 * 몰트바는 BAR 에, 면세점은 BOTTLE_SHOP 에 합쳤다(V107).
 */
export type VenueType = 'BAR' | 'BOTTLE_SHOP' | 'OTHER'

/** 공개 응답에는 HIDDEN 이 나오지 않는다. 관리자 응답에만 실린다. */
export type VenueStatus = 'ACTIVE' | 'HIDDEN' | 'CLOSED'

export interface VenueSummary {
  id: number
  venueType: VenueType
  status: VenueStatus
  nameKo: string
  /** 없으면 nameKo 로 폴백한다 — venueDisplayName() 을 쓸 것 */
  nameEn: string | null
  /** 현지 표기. 영문 로케일에서도 숨기지 않는다(현장에서 간판을 찾는 데 쓴다) */
  nameLocal: string | null
  address: string
  addressDetail: string | null
  lat: number | null
  lng: number | null
  /** 서버가 미리 계산해 준다 — 좌표가 유효하고 ACTIVE 인 경우만 true */
  mappable: boolean
  countryCode: string
  cityId: number
  citySlug: string
  cityNameKo: string
  cityNameEn: string
}

export interface VenueDetail {
  summary: VenueSummary
  phone: string | null
  website: string | null
  instagramUrl: string | null
  /** 자유 텍스트. 구조화되어 있지 않으므로 그대로 표시한다 */
  openingHours: string | null
  googleMapsUrl: string | null
  naverMapsUrl: string | null
  kakaoMapsUrl: string | null
  googlePlaceId: string | null
  naverPlaceId: string | null
  descriptionKo: string | null
  descriptionEn: string | null
}

export interface VenueCity {
  id: number
  countryCode: string
  slug: string
  nameKo: string
  nameEn: string
  centerLat: number
  centerLng: number
  defaultZoom: number
  venueCount: number
}

export interface VenueCountry {
  countryCode: string
  venueCount: number
  cities: VenueCity[]
}

/** 도시 하나 + 그 안의 장소 전부. 지도의 첫 프레임이 이 응답 하나로 완성된다. */
export interface VenueCityDetail {
  city: VenueCity
  venues: VenueSummary[]
}

// ── 관리자 ────────────────────────────────────────────────

export interface AdminVenue {
  venue: VenueDetail
  submittedByNickname: string | null
  submittedById: number | null
  createdAt: string
  updatedAt: string
}

export interface AdminVenueCity {
  id: number
  countryCode: string
  slug: string
  nameKo: string
  nameEn: string
  centerLat: number
  centerLng: number
  defaultZoom: number
  sortOrder: number
  active: boolean
  /** 비공개 포함. 0 이 아니면 삭제할 수 없다 */
  venueCount: number
}

/**
 * 등록·수정 페이로드.
 *
 * 서버와 마찬가지로 <b>전체 치환</b>이다 — 폼이 항상 전 필드를 보낸다.
 * 부분 갱신으로 두면 "전화번호를 지웠다"와 "안 건드렸다"를 구분할 수 없다.
 */
export interface VenueUpsertPayload {
  venueCityId: number
  venueType: VenueType
  status: VenueStatus
  nameKo: string
  nameEn: string | null
  nameLocal: string | null
  address: string
  addressDetail: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  website: string | null
  instagramUrl: string | null
  openingHours: string | null
  googleMapsUrl: string | null
  naverMapsUrl: string | null
  kakaoMapsUrl: string | null
  googlePlaceId: string | null
  naverPlaceId: string | null
  descriptionKo: string | null
  descriptionEn: string | null
}

export interface VenueCityUpsertPayload {
  countryCode: string
  slug: string
  nameKo: string
  nameEn: string
  centerLat: number
  centerLng: number
  defaultZoom: number | null
  sortOrder: number | null
  isActive: boolean
}

// ── 표시용 상수·헬퍼 ──────────────────────────────────────

/** 관리자 화면 전용이라 한국어 고정 (집안 규칙: /admin/** 는 다국어 대상이 아니다). */
export const VENUE_TYPE_LABEL_KO: Record<VenueType, string> = {
  BAR: '바',
  // enum 값은 BOTTLE_SHOP 이지만 화면에는 "리쿼샵"으로 쓴다 —
  // 식별자는 안정적이어야 하고 라벨은 표현이라, 표현이 바뀔 때마다 데이터를 옮기지 않는다.
  BOTTLE_SHOP: '리쿼샵',
  OTHER: '기타',
}

export const VENUE_STATUS_LABEL_KO: Record<VenueStatus, string> = {
  ACTIVE: '공개',
  HIDDEN: '비공개',
  CLOSED: '폐업',
}

export const VENUE_TYPES: VenueType[] = ['BAR', 'BOTTLE_SHOP', 'OTHER']
export const VENUE_STATUSES: VenueStatus[] = ['ACTIVE', 'HIDDEN', 'CLOSED']

/**
 * 로케일에 맞는 표시명. 영문 로케일에서 영문명이 없으면 한글명으로 떨어진다 —
 * 빈 칸을 남기는 것보다 낫다(이 저장소의 nameEn || nameKo 규약과 같다).
 */
export function venueDisplayName(venue: { nameKo: string; nameEn: string | null }, lang: string) {
  return lang === 'en' ? venue.nameEn || venue.nameKo : venue.nameKo
}

// ── 댓글 ──────────────────────────────────────────────────

export interface VenueCommentImage {
  id: number
  imageUrl: string
  sortOrder: number
}

export interface VenueComment {
  id: number
  /** 숨김 처리된 댓글은 null — 자리는 남기되 내용은 지운다 */
  userId: number | null
  nickname: string | null
  profileImageUrl: string | null
  content: string | null
  images: VenueCommentImage[]
  /** 신고 누적 또는 관리자 조치. 화면은 "숨김 처리된 댓글입니다"로 그린다 */
  hidden: boolean
  createdAt: string
  updatedAt: string
  replies: VenueComment[]
}

/**
 * 사진 교체 계획. 각 칸은 <b>정확히 하나</b>만 채운다 —
 * `imageId`(기존 유지) 또는 `fileIndex`(새로 올린 파일의 인덱스).
 * 배열 순서가 그대로 노출 순서가 된다.
 */
export interface VenueCommentImagePlanItem {
  imageId?: number
  fileIndex?: number
}

/** 댓글 사진 상한 — 서버(VenueCommentImageService.MAX_IMAGES)와 반드시 같아야 한다. */
export const VENUE_COMMENT_MAX_IMAGES = 5
/** 장당 상한(10MB). 서버가 다시 검증하지만, 올리기 전에 막는 편이 사용자에게 빠르다. */
export const VENUE_COMMENT_MAX_FILE_SIZE = 10 * 1024 * 1024
export const VENUE_COMMENT_MAX_TOTAL_SIZE = 50 * 1024 * 1024
export const VENUE_COMMENT_MAX_LENGTH = 1000

// ── 제보 ──────────────────────────────────────────────────

export type VenueRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface VenueRequestBody {
  venueType: VenueType
  nameKo: string
  nameEn: string | null
  nameLocal: string | null
  countryCode: string
  cityName: string | null
  address: string
  addressDetail: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  website: string | null
  instagramUrl: string | null
  openingHours: string | null
  naverMapsUrl: string | null
  kakaoMapsUrl: string | null
  googleMapsUrl: string | null
  descriptionKo: string | null
}

export interface VenueRequest {
  id: number
  userId: number
  nickname: string
  status: VenueRequestStatus
  rejectReason: string | null
  createdVenueId: number | null
  venue: VenueRequestBody
  createdAt: string
  reviewedAt: string | null
}

/** 공유 링크 해석 결과. `source`가 GEOCODED면 화면이 정확도 확인을 요구해야 한다. */
export interface VenueLinkResolveResult {
  lat: number | null
  lng: number | null
  resolvedUrl: string | null
  googlePlaceId: string | null
  naverPlaceId: string | null
  source: 'PARSED' | 'EXPANDED' | 'GEOCODED' | 'NONE'
  message: string
}

// ── 주류 연계 ──────────────────────────────────────────────

export interface SpiritVenue {
  venue: VenueSummary
  reviewCount: number
  lastReviewedAt: string
}
