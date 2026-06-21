export type StoreType = 'DOMESTIC' | 'OVERSEAS' | 'DUTYFREE'
export type PriceCurrency = 'KRW' | 'USD'
export type BucketType = 'INDIVIDUAL' | 'WEEKLY'
export type PriceReportReportReason = 'FALSE_PRICE' | 'DUPLICATE' | 'BAD_IMAGE' | 'OTHER'
export type DiscountType = 'PAYMENT' | 'BUNDLE' | 'COUPON' | 'OTHER'
export type DutyFreeChannel = 'AIRPORT' | 'CITY' | 'INFLIGHT' | 'ONLINE'
export type PriceReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ChartPoint {
  date: string
  minFinalPrice: number | null
  maxPrice: number | null
  avgSalePrice: number | null
  storeCount: number
  reportIds: number[]
}

export interface ChartSeries {
  spiritId: number
  points: ChartPoint[]
}

export interface ChartResponse {
  bucketType: BucketType
  currency: PriceCurrency
  points: ChartPoint[]
  series: ChartSeries[]
}

export interface DiscountItemDetail {
  id: number
  discountType: DiscountType
  discountAmount: number
  description: string | null
}

export interface PriceReportChartDetail {
  reportId: number
  spiritId: number | null
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
  isHotDeal?: boolean
  variantLabel?: string | null
  sourceSite?: string | null
  sourceUrl?: string | null
}

export interface StoreSearchResult {
  id: number
  displayName: string
  storeType: StoreType
  dutyfreeChannel: DutyFreeChannel | null
}

export interface PriceReportSummary {
  id: number
  spiritId: number
  spiritNameKo: string
  storeName: string | null
  suggestedStoreName: string | null
  status: PriceReportStatus
  currency: PriceCurrency
  actualPrice: number | null
  purchasedAt: string | null
  isAnonymous: boolean
  createdAt: string
}

// ── 관리자 ───────────────────────────────────────
export interface AdminPriceImage {
  id: number
  imageUrl: string
  sortOrder: number | null
  isPublic: boolean
}

export interface AdminPriceDiscountItem {
  id: number
  discountType: DiscountType
  discountAmount: number
  description: string | null
}

export interface AdminPriceReport {
  id: number
  spiritId: number
  spiritNameKo: string
  storeId: number | null
  storeName: string | null
  suggestedStoreName: string | null
  suggestedDutyfreeChannel: DutyFreeChannel | null
  status: PriceReportStatus
  currency: PriceCurrency
  regularPrice: number | null
  salePrice: number | null
  paybackAmount: number | null
  actualPrice: number | null
  exchangeRateSnapshot: number | null
  purchasedAt: string | null
  description: string | null
  isAnonymous: boolean
  reporterId: number | null
  reporterNickname: string | null
  autoFlagged: boolean
  reportCount: number
  rejectReason: string | null
  images: AdminPriceImage[]
  discountItems: AdminPriceDiscountItem[]
  createdAt: string
  approvedAt: string | null
}

export interface AdminStore {
  id: number
  displayName: string
  storeType: StoreType
  dutyfreeChannel: DutyFreeChannel | null
  region: string | null
  isApproved: boolean
  createdById: number | null
  createdByNickname: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StoreAlias {
  id: number
  alias: string
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
  dutyfreeChannel?: DutyFreeChannel | null
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
