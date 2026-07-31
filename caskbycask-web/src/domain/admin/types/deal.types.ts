// 가격 동향 — 크롤러 자동수집 + 관리자 직접 등록. 관리자 검토 타입. (백엔드 deal 도메인 DTO 와 1:1)

import type { StoreType } from '../../pricetracker/types/pricetracker.types'

export type DealStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const DEAL_CATEGORIES = [
  'WHISKY', 'COGNAC', 'WINE', 'TEQUILA', 'RUM', 'BEER', 'SOJU', 'OTHER',
] as const

export interface DealPostSummary {
  id: number
  sourceSite: string
  drinkName: string | null
  drinkCategory: string | null
  volumeMl: number | null
  originalPrice: number | null
  dealPrice: number | null
  discountRate: number | null   // 0.0 ~ 1.0
  confidenceScore: number | null // 1 ~ 10
  status: DealStatus
  crawledAt: string | null
  sourceUrl: string
}

export interface DealPostDetail {
  id: number
  sourceUrl: string
  sourceSite: string
  drinkName: string | null
  drinkCategory: string | null
  volumeMl: number | null
  originalPrice: number | null
  dealPrice: number | null
  discountRate: number | null
  currency: string | null
  seller: string | null
  dealCondition: string | null
  expiryInfo: string | null
  confidenceScore: number | null
  summaryKo: string | null
  isVisible: boolean
  status: DealStatus
  crawledAt: string | null
  createdAt: string
  updatedAt: string
  spiritId: number | null
  spiritNameKo: string | null
  spiritNameEn: string | null
  spiritVariantType: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE' | null
  spiritVariantValue: string | null
  spiritVariantValueEn: string | null
  spiritSeriesIdentifier: string | null
  spiritSeriesIdentifierEn: string | null
  spiritBatchNo: string | null
  spiritBottledDate: string | null
  storeType: StoreType
}

export interface UpdateDealRequest {
  drinkName: string | null
  drinkCategory: string | null
  volumeMl: number | null
  originalPrice: number | null
  dealPrice: number | null
  discountRate: number | null
  currency: string | null
  seller: string | null
  dealCondition: string | null
  expiryInfo: string | null
  summaryKo: string | null
  spiritId: number | null
  storeType: StoreType
}

/**
 * 관리자 직접 가격 등록 요청.
 * 크롤러 수집분과 달리 검토 대기를 건너뛰고 바로 승인·노출로 저장되므로
 * 주류 연결(spiritId)과 정상가·판매가가 필수다.
 * sourceUrl 을 비우면 백엔드가 내부 멱등키(admin://deal/...)를 생성한다.
 */
export interface CreateDealRequest {
  spiritId: number
  drinkName: string | null
  drinkCategory: string | null
  volumeMl: number | null
  originalPrice: number
  dealPrice: number
  currency: string | null
  seller: string | null
  dealCondition: string | null
  expiryInfo: string | null
  summaryKo: string | null
  storeType: StoreType
  sourceUrl: string | null
  /** 가격을 확인한 날짜(YYYY-MM-DD). 가격 차트의 X축이 된다. */
  observedAt: string | null
}
