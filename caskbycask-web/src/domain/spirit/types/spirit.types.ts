export type SpiritCategory = 'WHISKY' | 'COGNAC' | 'WINE' | 'OTHER'
export type SpiritStatus  = 'ACTIVE' | 'HIDDEN' | 'PENDING'
export type SpiritSort    = 'LATEST' | 'SCORE_DESC' | 'REVIEW_COUNT_DESC'

export interface SpiritAutocompleteItem {
  id: number
  nameKo: string
  nameEn: string
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  category: SpiritCategory
  imageUrl: string | null
  canonicalPathKo?: string | null
  canonicalPathEn?: string | null
}

export interface SpiritSeo {
  canonicalId: number
  canonicalPathKo: string
  canonicalPathEn: string
  canonicalUrlKo: string
  canonicalUrlEn: string
  titleKo: string
  titleEn: string
  descriptionKo: string
  descriptionEn: string
  primaryImageUrl: string
  updatedAt: string | null
}

export interface SpiritListItem {
  id: number
  nameKo: string
  nameEn: string
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  category: SpiritCategory
  country: string | null
  abv: number | null
  abvMin?: number | null
  abvMax?: number | null
  volumeMlMin?: number | null
  volumeMlMax?: number | null
  avgScore: number | null
  reviewCount: number
  primaryImageUrl: string | null
  canonicalPathKo?: string | null
  canonicalPathEn?: string | null
  viewCount?: number
  status?: SpiritStatus
}

export interface SpiritImage {
  id: number
  imageUrl: string
  isPrimary: boolean
  sortOrder: number
}

export interface SpiritDetail extends SpiritListItem {
  producerId: number | null
  producerNameKo: string | null
  producerNameEn: string | null
  bottler: string | null
  bottledYear: number | null
  vintageYear: number | null
  volumeMl: number | null
  region: string | null
  status: SpiritStatus
  images: SpiritImage[]
  createdAt: string
  updatedAt: string
  parentId?: number | null
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE'
  variantValue?: string | null
  variantValueEn?: string | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  displayOrder?: number | null
  abvMin?: number | null
  abvMax?: number | null
  variants: SpiritVariant[]
  // 카테고리 서브 테이블
  commonDetail: SpiritCommonDetailResponse | null
  whiskyDetail: WhiskyDetailResponse | null
  wineDetail: WineDetailResponse | null
  cognacDetail: CognacDetailResponse | null
  otherDetail: OtherDetailResponse | null
}

/** 같은 이름의 다른 배치·병입 제품 (술 상세 "다른 배치 · 병입" 목록) */
export interface SpiritVariant {
  id: number
  nameKo: string
  nameEn: string
  category: SpiritCategory
  bottledYear: number | null
  vintageYear: number | null
  abv: number | null
  volumeMl: number | null
  batchNo: string | null
  bottleNo: string | null
  bottledDate: string | null
  avgScore: number | null
  reviewCount: number
  primaryImageUrl: string | null
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE'
  variantValue?: string | null
  variantValueEn?: string | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  displayOrder?: number | null
}

export interface CreateSpiritVariantRequest {
  variantValue: string
  variantValueEn?: string | null
}

// ── 카테고리 상세 Enum 타입 ────────────────────────────────────
export type WhiskyStyle = 'SINGLE_MALT' | 'BLENDED_MALT' | 'BLENDED_WHISKY' | 'BOURBON' | 'WHEATED_BOURBON' | 'TENNESSEE' | 'RYE' | 'POT_STILL' | 'GRAIN_CORN' | 'OTHER'
export type BottlingType = 'OB' | 'IB'
export type WhiskyCaskType =
  | 'EX_BOURBON' | 'EX_SHERRY' | 'EX_FINO' | 'EX_MANZANILLA' | 'EX_AMONTILLADO' | 'EX_OLOROSO' | 'EX_PALO_CORTADO' | 'EX_PX'
  | 'EX_PORT' | 'EX_MADEIRA' | 'EX_SAUTERNES' | 'EX_MARSALA' | 'EX_MALAGA' | 'EX_TOKAJI' | 'EX_VERMOUTH' | 'EX_WINE' | 'VINO_BARRIQUE'
  | 'EX_RUM' | 'EX_COGNAC' | 'EX_BRANDY' | 'EX_CALVADOS' | 'EX_ARMAGNAC' | 'EX_MEZCAL_TEQUILA' | 'EX_BEER'
  | 'NEW_OAK' | 'FRENCH_OAK' | 'CHINKAPIN' | 'MIZUNARA' | 'EX_UMESHU' | 'TEAK_WOOD' | 'PEATED_CASK' | 'OTHER'
export type WineType = 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING' | 'DESSERT' | 'ORANGE' | 'FORTIFIED'
export type WineCertification = 'ORGANIC' | 'BIODYNAMIC' | 'SUSTAINABLE' | 'NONE'
export type WineSweetness = 'DRY' | 'OFF_DRY' | 'MEDIUM' | 'SWEET'
export type WineBody = 'LIGHT' | 'MEDIUM' | 'FULL'
export type WineIntensity = 'LOW' | 'MEDIUM' | 'HIGH'
export type CognacGrade = 'VS' | 'NAPOLEON' | 'VSOP' | 'XO' | 'XXO' | 'HORS_DAGE'
export type CognacCru = 'GRANDE_CHAMPAGNE' | 'PETITE_CHAMPAGNE' | 'BORDERIES' | 'FINS_BOIS' | 'BONS_BOIS'
export type OtherSpiritType = 'RUM' | 'GIN' | 'VODKA' | 'TEQUILA' | 'MEZCAL' | 'BRANDY' | 'LIQUEUR' | 'SAKE' | 'SOJU' | 'BAIJIU' | 'ABSINTHE' | 'BEER' | 'OTHER'
// ── 상세 응답 타입 ──────────────────────────────────────────────
export interface GrapeVariety { name: string; percentage: number | null }

export interface SpiritCommonDetailResponse {
  isNas: boolean
  ageStatement: number | null
  ageStatementMonths: number | null
  ageStatementMin: number | null
  ageStatementMinMonths: number | null
  ageStatementMax: number | null
  ageStatementMaxMonths: number | null
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
  styleOther: string | null
  brandName: string | null
  bottlingType: BottlingType | null
  caskTypes: WhiskyCaskType[] | null
  caskFinishes: WhiskyCaskType[] | null
  caskTypeOther: string | null
  caskDetails: Record<WhiskyCaskType, string[]> | null
  isNonChillFiltered: boolean | null
  isNaturalColour: boolean | null
  isSingleCask: boolean | null
  isCaskStrength: boolean | null
  isPeated: boolean | null
  phenolPpm: number | null
  phenolPpmMin: number | null
  phenolPpmMax: number | null
  caskNo: string | null
  notes: string | null
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
  sweetness: WineSweetness | null
  body: WineBody | null
  acidity: WineIntensity | null
  tannin: WineIntensity | null
}

export interface CognacDetailResponse {
  grade: CognacGrade | null
  cru: CognacCru | null
  isFineChampagne: boolean | null
  blendDetail: string | null
  vintageYear: number | null
  ageYears: number | null
  oakType: string | null
  caskFinish: string | null
}

export interface OtherDetailResponse {
  otherType: OtherSpiritType | null
  mainIngredient: string | null
  productionMethod: string | null
  notes: string | null
  styleClassification: string | null
  caskType: string | null
  originDesignation: string | null
}

export interface SpiritSearchParams {
  keyword?: string
  category?: SpiritCategory
  whiskyStyle?: WhiskyStyle[]
  wineType?: WineType[]
  wineSweetness?: WineSweetness[]
  wineBody?: WineBody[]
  wineAcidity?: WineIntensity[]
  wineTannin?: WineIntensity[]
  cognacGrade?: CognacGrade[]
  country?: string
  region?: string
  producerId?: number
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
