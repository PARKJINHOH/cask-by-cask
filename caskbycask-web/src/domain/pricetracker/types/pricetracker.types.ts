export type StoreType = 'DOMESTIC' | 'OVERSEAS' | 'DUTYFREE'
/** 국내/해외/면세 탭 순서. 차트·목록·등록·관리자 화면이 모두 이 배열을 공유한다. */
export const STORE_TYPES = ['DOMESTIC', 'OVERSEAS', 'DUTYFREE'] as const
export type PriceCurrency = 'KRW' | 'TWD' | 'USD' | 'JPY' | 'CNY' | 'EUR'
export type ForeignPriceCurrency = Exclude<PriceCurrency, 'KRW'>
export type PriceInputMode = 'AUTO_CONVERTED' | 'KRW_DIRECT'
export type BucketType = 'INDIVIDUAL' | 'WEEKLY'
export type PriceReportReportReason = 'FALSE_PRICE' | 'DUPLICATE' | 'BAD_IMAGE' | 'OTHER'
export type DiscountType = 'PAYMENT' | 'BUNDLE' | 'COUPON' | 'OTHER'
export type DutyFreeChannel = 'AIRPORT' | 'CITY' | 'INFLIGHT' | 'ONLINE'
export type PriceReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type VolumeSelection = number | 'UNKNOWN'

export interface PriceVolumeOption {
  volumeMl: number | null
  count: number
}

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
  /** 국내/해외/면세 각각의 등록 건수. 기간·용량 필터는 적용된 값이다. */
  storeTypeCounts?: Partial<Record<StoreType, number>>
}

export interface ExchangeRateQuote {
  currency: ForeignPriceCurrency
  krwPerUnit: number
  provider: string
  effectiveDate: string
  fetchedAt: string
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
  volumeMl: number | null
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
  /** 원 통화. finalPrice/salePrice/regularPrice 는 이와 무관하게 항상 원화다. */
  currency?: PriceCurrency | null
  originalFinalPrice?: number | null
  originalRegularPrice?: number | null
  exchangeRateSnapshot?: number | null
  exchangeRateDate?: string | null
}

export interface PriceReportSummary {
  id: number
  spiritId: number
  spiritNameKo: string
  volumeMl: number | null
  storeName: string | null
  suggestedStoreName: string | null
  status: PriceReportStatus
  currency: PriceCurrency
  actualPrice: number | null
  actualPriceKrw: number | null
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
  volumeMl: number | null
  storeId: number | null
  storeName: string | null
  suggestedStoreName: string | null
  suggestedDutyfreeChannel: DutyFreeChannel | null
  storeType: StoreType
  needsStoreResolution: boolean
  status: PriceReportStatus
  currency: PriceCurrency
  regularPrice: number | null
  salePrice: number | null
  paybackAmount: number | null
  actualPrice: number | null
  actualPriceKrw: number | null
  priceInputMode: PriceInputMode
  exchangeRateSnapshot: number | null
  exchangeRateDate: string | null
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

export interface PriceAlertResponse {
  id: number
  spiritId: number
  spiritNameKo: string
  spiritNameEn: string
  volumeMl: number | null
  storeType: StoreType
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
  volumeMl: number
  storeId?: number | null
  storeType?: StoreType | null
  suggestedStoreName?: string | null
  dutyfreeChannel?: DutyFreeChannel | null
  currency?: PriceCurrency | null
  priceInputMode?: PriceInputMode | null
  isAnonymous: boolean
  regularPrice?: number | null
  salePrice?: number | null
  paybackAmount?: number | null
  finalPrice?: number | null
  finalPriceKrw?: number | null
  exchangeRate?: number | null
  description?: string | null
  purchasedAt?: string | null
  imageIds: number[]
  imagePublicFlags: boolean[]
  discountItems?: DiscountItemInput[]
}
