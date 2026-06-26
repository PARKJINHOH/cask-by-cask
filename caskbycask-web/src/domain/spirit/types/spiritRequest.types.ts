import type {
  SpiritCategory, WhiskyStyle, WineType, CognacGrade, OtherSpiritType,
} from './spirit.types'
import type {
  WineDetailRequest, CognacDetailRequest, OtherDetailRequest,
} from '@/domain/admin/types/admin.types'

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

// 에디션 유형 (위스키 — 관리자 폼과 동일). NONE = 정규(에디션 없음)
export type RequestVariantType = 'NONE' | 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK'

export interface SpiritRegisterRequestForm {
  nameKo: string
  nameEn: string
  category: SpiritCategory
  producerId?: number | null
  abv?: number | null
  abvMin?: number | null   // 도수 범위 지정 시
  abvMax?: number | null
  country?: string
  region?: string
  bottler?: string
  bottledYear?: number | null
  vintageYear?: number | null
  volumeMl?: number | null
  volumeMlMin?: number | null
  volumeMlMax?: number | null
  // 공통 상세 (신청자 입력 — 관리자 등록 참고용)
  ageStatement?: number | null
  ageStatementMonths?: number | null
  ageStatementMin?: number | null       // 숙성 연수 범위 지정 시
  ageStatementMinMonths?: number | null
  ageStatementMax?: number | null
  ageStatementMaxMonths?: number | null
  isNas?: boolean
  distilledDate?: string   // YYYY 또는 YYYY-MM
  bottledDate?: string     // YYYY 또는 YYYY-MM
  releaseDate?: string     // YYYY-MM-DD
  bottleNo?: string
  batchNo?: string
  totalBottles?: number | null
  // 카테고리 핵심값 (신청자 입력 — 관리자 등록 참고용)
  whiskyStyle?: WhiskyStyle | null
  whiskyStyleOther?: string   // whiskyStyle=OTHER 일 때 직접 입력
  brandName?: string          // 브랜드명 (위스키, 선택)
  bottlingType?: string       // 병입 구분 OB/IB (위스키, 선택)
  caskNo?: string             // 캐스크 번호 (위스키, 선택)
  whiskyNotes?: string        // 기타 정보 (위스키, 참고용 자유 입력)
  // 캐스크 및 특성 (위스키, 선택 — 관리자 등록 폼 참고용)
  caskTypes?: string[]
  caskFinishes?: string[]
  caskTypeOther?: string
  caskDetails?: Record<string, string[]>
  isNonChillFiltered?: boolean
  isNaturalColour?: boolean
  isSingleCask?: boolean
  isCaskStrength?: boolean
  isPeated?: boolean
  phenolPpm?: number | null
  phenolPpmMin?: number | null
  phenolPpmMax?: number | null
  wineType?: WineType | null
  cognacGrade?: CognacGrade | null
  otherType?: OtherSpiritType | null
  // 와인/꼬냑/기타 전체 상세 (신청자 입력 보존용 — 핵심값 외 나머지 필드)
  wineDetail?: WineDetailRequest | null
  cognacDetail?: CognacDetailRequest | null
  otherDetail?: OtherDetailRequest | null
  // 에디션 유형 (위스키 전용, 선택 — 관리자 등록 폼 참고용)
  variantType?: RequestVariantType | null
  variantValue?: string | null      // 에디션 값 (예: Batch 11, 2023)
  variantValueEn?: string | null     // 에디션 값 영문
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  // 유지할 기존 이미지 URL 목록 (수정 시 전송 — 신규 파일은 multipart 별도)
  imageUrls?: string[]
  // 관리자에게 전달할 기타 문구 (선택)
  note?: string
}

// 내 요청 수정 폼 프리필용 상세 (GET /requests/me/{id})
export interface MySpiritRequestDetail extends SpiritRegisterRequestForm {
  id: number
  status: RequestStatus
  imageUrls: string[]
  producerNameKo?: string | null
}

export interface MySpiritRequest {
  id: number
  nameKo: string
  nameEn: string
  category: SpiritCategory
  status: RequestStatus
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
}
