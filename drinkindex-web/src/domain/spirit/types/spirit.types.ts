export type SpiritCategory = 'WHISKY' | 'COGNAC' | 'WINE' | 'OTHER'
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
  status?: SpiritStatus
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
  // 카테고리 서브 테이블
  commonDetail: SpiritCommonDetailResponse | null
  whiskyDetail: WhiskyDetailResponse | null
  wineDetail: WineDetailResponse | null
  cognacDetail: CognacDetailResponse | null
}

// ── 카테고리 상세 Enum 타입 ────────────────────────────────────
export type WhiskyStyle = 'SINGLE_MALT' | 'BLENDED_MALT' | 'BLENDED_WHISKY' | 'BOURBON' | 'RYE' | 'CORN' | 'GRAIN' | 'POT_STILL'
export type BottlingType = 'OB' | 'IB'
export type WhiskyCaskType = 'EX_BOURBON' | 'EX_SHERRY' | 'EX_PORT' | 'EX_WINE' | 'NEW_OAK' | 'EX_RUM' | 'EX_MADEIRA' | 'EX_SAUTERNES' | 'EX_COGNAC' | 'MIZUNARA' | 'OTHER'
export type MaturationStyle = 'FULL_MATURATION' | 'FINISH'
export type WineType = 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING' | 'DESSERT' | 'ORANGE'
export type WineCertification = 'ORGANIC' | 'BIODYNAMIC' | 'SUSTAINABLE' | 'NONE'
export type CognacGrade = 'VS' | 'NAPOLEON' | 'VSOP' | 'XO' | 'XXO' | 'HORS_DAGE'
export type CognacCru = 'GRANDE_CHAMPAGNE' | 'PETITE_CHAMPAGNE' | 'BORDERIES' | 'FINS_BOIS' | 'BONS_BOIS'
// ── 상세 응답 타입 ──────────────────────────────────────────────
export interface GrapeVariety { name: string; percentage: number | null }

export interface SpiritCommonDetailResponse {
  isNas: boolean
  ageStatement: number | null
  distilledDate: string | null
  bottledDate: string | null
  releaseDate: string | null
  volumeMl: number | null
  abv: number | null
  bottleNo: string | null
  batchNo: string | null
  totalBottles: number | null
}

export interface WhiskyDetailResponse {
  style: WhiskyStyle | null
  bottlingType: BottlingType | null
  caskType: WhiskyCaskType | null
  maturationStyle: MaturationStyle | null
  finishCaskType: WhiskyCaskType | null
  isNonChillFiltered: boolean | null
  isNaturalColour: boolean | null
  isSingleCask: boolean | null
  isCaskStrength: boolean | null
  isPeated: boolean | null
  phenolPpm: number | null
  caskNo: string | null
  finishCaskDetail: string | null
}

export interface WineDetailResponse {
  wineType: WineType | null
  vintage: number | null
  isOakAged: boolean | null
  isNaturalWine: boolean | null
  certification: WineCertification | null
  grapeVarieties: GrapeVariety[] | null
  appellationDesignation: string | null
  soilType: string | null
  altitudeM: number | null
  harvestMethod: string | null
  fermentationVessel: string | null
  oakType: string | null
  oakAgedMonths: number | null
}

export interface CognacDetailResponse {
  grade: CognacGrade | null
  cru: CognacCru | null
  isFineChampagne: boolean | null
  blendDetail: string | null
}

export interface SpiritSearchParams {
  keyword?: string
  category?: SpiritCategory
  whiskyStyle?: WhiskyStyle
  wineType?: WineType
  cognacGrade?: CognacGrade
  country?: string
  region?: string
  minAbv?: number
  maxAbv?: number
  minScore?: number
  maxScore?: number
  sort?: SpiritSort
  page?: number
  size?: number
}

export interface CountryStats {
  country: string
  count: number
}

export interface RegionStats {
  region: string
  count: number
}
