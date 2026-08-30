export type SpiritCategory = 'WHISKY' | 'COGNAC' | 'WINE' | 'OTHER'
export type SpiritStatus  = 'ACTIVE' | 'HIDDEN' | 'PENDING'
export type SpiritSort    = 'LATEST' | 'SCORE_DESC' | 'REVIEW_COUNT_DESC'
export type WineVintageStatus = 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN'
/** 에디션(하위 주류) 구분 유형. 'NONE' = 에디션 없음 (백엔드 VariantType 과 1:1) */
export type SpiritVariantType = 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'VINTAGE' | 'NONE'

export interface SpiritAutocompleteItem {
  id: number
  nameKo: string
  nameEn: string
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  parentId?: number | null
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'VINTAGE' | 'NONE' | null
  variantValue?: string | null
  variantValueEn?: string | null
  displayOrder?: number | null
  category: SpiritCategory
  vintageYear?: number | null
  vintageStatus?: WineVintageStatus | null
  abv?: number | null
  avgScore?: number | null
  reviewCount?: number | null
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
  relationType?: 'STANDALONE' | 'MASTER' | 'EDITION'
  parent?: SpiritSeoRelation | null
  editions?: SpiritSeoRelation[]
  recentPrice?: SpiritSeoPriceObservation | null
  recentHotDeal?: SpiritSeoPriceObservation | null
}

export interface SpiritSeoRelation {
  id: number
  nameKo: string
  nameEn: string
  canonicalPathKo: string
  canonicalPathEn: string
}

export interface SpiritSeoPriceObservation {
  amount: number | string
  currency: string | null
  sourceName: string | null
  observedDate: string | null
  sourceUrl: string | null
}

export interface SpiritListItem {
  id: number
  nameKo: string
  nameEn: string
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  category: SpiritCategory
  vintageYear?: number | null
  vintageStatus?: WineVintageStatus | null
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
  sourceProvider?: string | null
  sourceUrl?: string | null
  sourceImageUrl?: string | null
  sourceRating?: number | null
  sourceRatingCount?: number | null
  status?: SpiritStatus
}

export interface SpiritImage {
  id: number
  imageUrl: string
  isPrimary: boolean
  sortOrder: number
}

export interface SpiritDetail extends SpiritListItem {
  /**
   * avgScore 를 낸 모수 — 점수를 남긴 리뷰 수.
   * reviewCount 는 점수 없는 리뷰까지 센 총 리뷰 수라 평점 옆에는 이 값을 쓴다.
   */
  scoredReviewCount: number
  producerId: number | null
  producerNameKo: string | null
  producerNameEn: string | null
  vintageYear: number | null
  volumeMl: number | null
  region: string | null
  /**
   * 와인 산지 (지도 표시용) — 산지 미지정 시 null.
   * 국가 지도에서 칠할 L1 = parentCode ?? code / 확대 지도에서 칠할 L2 = parentCode ? code : null
   */
  wineRegion: SpiritWineRegion | null
  status: SpiritStatus
  images: SpiritImage[]
  createdAt: string
  updatedAt: string
  parentId?: number | null
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'VINTAGE' | 'NONE'
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
  vintageYear: number | null
  vintageStatus: WineVintageStatus | null
  abv: number | null
  volumeMl: number | null
  bottleNo: string | null
  bottledDate: string | null
  avgScore: number | null
  reviewCount: number
  primaryImageUrl: string | null
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'VINTAGE' | 'NONE'
  variantValue?: string | null
  variantValueEn?: string | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  displayOrder?: number | null
  createdAt: string
  commonDetail?: SpiritCommonDetailResponse | null
  whiskyDetail?: WhiskyDetailResponse | null
  wineDetail?: WineDetailResponse | null
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
// 와인 맛 지표는 5단계다 — 백엔드 WineSweetness/WineBody/WineIntensity enum 과 값·순서를 일치시킬 것.
// (표시용 스케일 정의는 domain/spirit/data/wineTasteScale.ts)
export type WineSweetness = 'DRY' | 'OFF_DRY' | 'MEDIUM' | 'MEDIUM_SWEET' | 'SWEET'
export type WineBody = 'LIGHT' | 'LIGHT_MEDIUM' | 'MEDIUM' | 'MEDIUM_FULL' | 'FULL'
export type WineIntensity = 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH'
export type CognacGrade =
  | 'VS' | 'NAPOLEON' | 'VSOP' | 'XO' | 'XXO' | 'EXTRA' | 'HORS_DAGE'
  /** 라벨에 등급 표기가 없는 큐베 — null(모름)과 구분된다 */
  | 'NO_STATEMENT'
export type CognacCru = 'GRANDE_CHAMPAGNE' | 'PETITE_CHAMPAGNE' | 'BORDERIES' | 'FINS_BOIS' | 'BONS_BOIS' | 'BOIS_ORDINAIRES'
/** 숙성에 쓰는 프렌치 오크 산지 — 백엔드 `CognacOakType` */
export type CognacOakType =
  | 'LIMOUSIN' | 'TRONCAIS' | 'ALLIER' | 'NEVERS' | 'VOSGES'
  | 'JUPILLES' | 'BERTRANGES' | 'FRENCH_OAK' | 'OTHER'
export type OtherSpiritType = 'RUM' | 'GIN' | 'VODKA' | 'TEQUILA' | 'MEZCAL' | 'BRANDY' | 'LIQUEUR' | 'SAKE' | 'SOJU' | 'BAIJIU' | 'ABSINTHE' | 'BEER' | 'OTHER'
// ── 상세 응답 타입 ──────────────────────────────────────────────
export interface GrapeVariety { name: string; percentage: number | null }

export interface SpiritCommonDetailResponse {
  isNas: boolean
  ageStatement: number | null
  ageStatementMonths: number | null
  distilledDate: string | null
  bottledDate: string | null
  volumeMl: number | null
  abv: number | null
  bottleNo: string | null
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
  vintageStatus: WineVintageStatus | null
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
  notes: string | null
}

export interface CruCompositionResponse {
  cru: CognacCru
  percentage: number | null
}

export interface CognacDetailResponse {
  grade: CognacGrade | null
  /** 대표 크뤼 — 구성 중 비율이 가장 높은 것 */
  cru: CognacCru | null
  /** 1개면 싱글 크뤼, 2개 이상이면 멀티 크뤼 블렌드 */
  cruComposition: CruCompositionResponse[] | null
  isFineChampagne: boolean | null
  blendDetail: string | null
  vintageYear: number | null
  ageYears: number | null
  oakTypes: CognacOakType[] | null
  caskFinish: string | null
  notes: string | null
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

/**
 * 카테고리별 등록 주류 수.
 * 목록에는 마스터만 실리지만 '등록 개수'는 에디션(하위 병입)까지 포함한 `totalCount` 를 쓴다.
 */
export interface SpiritCategoryStat {
  category: SpiritCategory
  spiritCount: number
  editionCount: number
  totalCount: number
}

/** 검색 조건에 걸린 등록 건수. `spiritCount` = 목록 카드 수, `totalCount` = 에디션 포함. */
export interface SpiritSearchCount {
  spiritCount: number
  editionCount: number
  totalCount: number
}

/**
 * 와인 산지 (백엔드 WineRegion enum 기반, 지도 표시용).
 * 코드는 백엔드가 단일 소스이며 프론트는 코드 → 기하 데이터(wineRegionMap)를 매핑한다.
 */
export interface SpiritWineRegion {
  /** 선택된 산지 코드 (L1 또는 L2) — 예: FR_BORDEAUX_MEDOC */
  code: string
  /** ISO 3166-1 alpha-2 국가 코드 — 예: FR */
  countryCode: string
  nameKo: string
  nameEn: string
  /** 상위 L1 코드 — 선택값이 L1 이면 null */
  parentCode: string | null
  parentNameKo: string | null
  parentNameEn: string | null
}

/** GET /api/wine-regions — 국가별 L1 산지 트리 (관리자 산지 선택기용) */
export type { RegionNode as WineRegionNode, RegionCountry as WineRegionCountry }
  from '@/domain/location/data/wineRegionSelection'
