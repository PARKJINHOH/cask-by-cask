// 주류 핫딜 자동수집 — 관리자 검토 타입. (백엔드 deal 도메인 DTO 와 1:1)

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
  spiritVariantValue: string | null
  spiritVariantValueEn: string | null
  spiritBatchNo: string | null
  spiritBottledDate: string | null
  storeType: StoreType
}

export interface UpdateDealRequest {
  drinkName: string | null
  drinkCategory: string | null
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
