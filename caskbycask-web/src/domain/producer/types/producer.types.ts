export type ProducerType = 'DISTILLERY' | 'WINERY' | 'COGNAC_HOUSE' | 'OTHER'

import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

/** 주류 카테고리 → 생산자 타입 매핑 (카테고리별 게이팅) */
export const CATEGORY_TO_PRODUCER_TYPE: Record<SpiritCategory, ProducerType> = {
  WHISKY: 'DISTILLERY',
  WINE: 'WINERY',
  COGNAC: 'COGNAC_HOUSE',
  OTHER: 'OTHER',
}

/** 생산자 타입 라벨 (한/영) */
export const PRODUCER_TYPE_LABEL: Record<ProducerType, { ko: string; en: string }> = {
  DISTILLERY:   { ko: '증류소',     en: 'Distillery' },
  WINERY:       { ko: '와이너리',   en: 'Winery' },
  COGNAC_HOUSE: { ko: '꼬냑하우스', en: 'Cognac House' },
  OTHER:        { ko: '생산자',     en: 'Producer' },
}

export interface Producer {
  id: number
  type: ProducerType
  nameKo: string
  nameEn: string
  country: string
  region: string | null
  /** 주류 등록 시 기본 선택할 WineRegion 코드. 복수·미매핑 산지는 null */
  regionCode: string | null
  website: string | null
  foundedYear: number | null
  descriptionKo: string | null
  descriptionEn: string | null
  /** 검색 별칭 (한글 음차 변형 등). 표시엔 미사용, 검색에만 사용 */
  searchKeywords: string | null
}

export interface AdminProducer extends Producer {
  spiritCount: number
}

export interface CreateProducerPayload {
  type?: ProducerType
  nameKo: string
  nameEn: string
  country: string
  region?: string
  website?: string
  foundedYear?: number
  descriptionKo?: string
  descriptionEn?: string
  searchKeywords?: string
}

export interface UpdateProducerPayload {
  type?: ProducerType
  nameKo?: string
  nameEn?: string
  country?: string
  region?: string | null
  website?: string | null
  foundedYear?: number | null
  descriptionKo?: string | null
  descriptionEn?: string | null
  searchKeywords?: string | null
}

// ── 생산자 선택 컴포넌트 공용 타입 (AdminProducerSelector / ProducerSelector 공유) ──
export interface NewProducerInput {
  nameKo: string
  nameEn: string
  country: string
}

export interface ProducerSelectorProps {
  value: number | null
  defaultName?: string
  /** 선택된 생산자 객체를 함께 전달 (국가·지역 자동 채움 등). 직접 등록/해제 시엔 undefined/null. */
  onChange: (id: number | null, producer?: Producer | null) => void
  placeholder?: string
  /** 지정 시 해당 타입 생산자만 표시 (카테고리 게이팅) */
  type?: ProducerType
  /**
   * 지정 시 "목록에 없는 생산자 직접 등록" 미니폼 노출 (기타 카테고리 전용).
   * 반환값이 number면 즉시 선택, null이면 선택 없이 닫힘(예: 승인 대기 요청).
   */
  onCreateNew?: (data: NewProducerInput) => Promise<number | null>
  defaultCountry?: string
}
