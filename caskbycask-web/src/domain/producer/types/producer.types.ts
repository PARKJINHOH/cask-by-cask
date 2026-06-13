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
  website: string | null
  foundedYear: number | null
  descriptionKo: string | null
  descriptionEn: string | null
  /** 검색 별칭 (한글 음차 변형 등). 표시엔 미사용, 검색에만 사용 */
  searchKeywords: string | null
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
