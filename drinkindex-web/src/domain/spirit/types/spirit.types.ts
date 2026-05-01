export type SpiritCategory = 'WHISKY' | 'COGNAC' | 'WINE' | 'TEQUILA' | 'RUM' | 'GIN' | 'VODKA' | 'OTHER'
export type SpiritStatus  = 'ACTIVE' | 'HIDDEN' | 'PENDING'
export type SpiritSort    = 'LATEST' | 'SCORE_DESC' | 'REVIEW_COUNT_DESC'

export interface SpiritListItem {
  id: number
  nameKo: string
  nameEn: string
  category: SpiritCategory
  country: string | null
  abv: number | null
  avgScore: number | null
  reviewCount: number
  primaryImageUrl: string | null
}

export interface SpiritImage {
  id: number
  imageUrl: string
  isPrimary: boolean
  sortOrder: number
}

export interface SpiritDetail extends SpiritListItem {
  distilleryId: number | null
  distilleryNameKo: string | null
  distilleryNameEn: string | null
  bottler: string | null
  bottledYear: number | null
  vintageYear: number | null
  volumeMl: number | null
  region: string | null
  status: SpiritStatus
  images: SpiritImage[]
  createdAt: string
  updatedAt: string
}

export interface SpiritSearchParams {
  keyword?: string
  category?: SpiritCategory
  country?: string
  minAbv?: number
  maxAbv?: number
  minScore?: number
  maxScore?: number
  sort?: SpiritSort
  page?: number
  size?: number
}
