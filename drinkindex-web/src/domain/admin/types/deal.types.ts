// 주류 핫딜 자동수집 — 관리자 검토 타입. (백엔드 deal 도메인 DTO 와 1:1)

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
}

export interface UpdateDealRequest {
  drinkName: string | null
  drinkCategory: string | null
  originalPrice: number | null
  dealPrice: number | null
  discountRate: number | null
  seller: string | null
  dealCondition: string | null
  expiryInfo: string | null
  summaryKo: string | null
}
