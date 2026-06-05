import type {
  SpiritCategory, WhiskyStyle, WineType, CognacGrade, OtherSpiritType,
} from './spirit.types'

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface SpiritRegisterRequestForm {
  nameKo: string
  nameEn: string
  category: SpiritCategory
  producerId?: number | null
  abv?: number | null
  country?: string
  region?: string
  bottler?: string
  bottledYear?: number | null
  vintageYear?: number | null
  volumeMl?: number | null
  // 공통 상세 (신청자 입력 — 관리자 등록 참고용)
  ageStatement?: number | null
  isNas?: boolean
  distilledDate?: string   // YYYY 또는 YYYY-MM
  bottledDate?: string     // YYYY 또는 YYYY-MM
  releaseDate?: string     // YYYY-MM-DD
  // 카테고리 핵심값 (신청자 입력 — 관리자 등록 참고용)
  whiskyStyle?: WhiskyStyle | null
  whiskyStyleOther?: string   // whiskyStyle=OTHER 일 때 직접 입력
  caskNo?: string             // 캐스크 번호 (위스키, 선택)
  wineType?: WineType | null
  cognacGrade?: CognacGrade | null
  otherType?: OtherSpiritType | null
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
