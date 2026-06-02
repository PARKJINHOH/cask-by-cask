export type StoreType = 'DOMESTIC' | 'DUTYFREE'
export type PriceCurrency = 'KRW' | 'USD'
export type BucketType = 'INDIVIDUAL' | 'WEEKLY'
export type PriceReportReportReason = 'FALSE_PRICE' | 'DUPLICATE' | 'BAD_IMAGE' | 'OTHER'
export type DiscountType = 'PAYMENT' | 'BUNDLE' | 'COUPON' | 'OTHER'

export interface ChartPoint {
  date: string
  minFinalPrice: number | null
  maxPrice: number | null
  avgSalePrice: number | null
  storeCount: number
  reportIds: number[]
}

export interface ChartResponse {
  bucketType: BucketType
  currency: PriceCurrency
  points: ChartPoint[]
}

export interface DiscountItemDetail {
  id: number
  discountType: DiscountType
  discountAmount: number
  description: string | null
}

export interface PriceReportChartDetail {
  reportId: number
  storeName: string | null
  suggestedStoreName: string | null
  finalPrice: number | null
  salePrice: number | null
  regularPrice: number | null
  paybackAmount: number | null
  isVerified: boolean
  isAnonymous: boolean
  reporterNickname: string | null
  description: string | null
  publicImageUrls: string[]
  purchasedAt: string | null
  discountItems: DiscountItemDetail[]
}

export interface StoreSearchResult {
  id: number
  displayName: string
  storeType: StoreType
  dutyfreeChannel: string | null
}

export interface PriceAlertResponse {
  id: number
  spiritId: number
  spiritNameKo: string
  spiritNameEn: string
  targetPriceKrw: number
  isActive: boolean
  lastNotifiedAt: string | null
  createdAt: string
}

export interface PriceReportImageUpload {
  id: number
  imageUrl: string
  originalFileName: string
}

export interface DiscountItemInput {
  discountType: DiscountType
  label: string
  amount: number
  sortOrder: number
}

export interface CreatePriceReportRequest {
  spiritId: number
  storeId?: number | null
  suggestedStoreName?: string | null
  currency: PriceCurrency
  isAnonymous: boolean
  regularPrice?: number | null
  salePrice?: number | null
  paybackAmount?: number | null
  finalPrice?: number | null
  exchangeRate?: number | null
  description?: string | null
  purchasedAt?: string | null
  imageIds: number[]
  imagePublicFlags: boolean[]
  discountItems?: DiscountItemInput[]
}
