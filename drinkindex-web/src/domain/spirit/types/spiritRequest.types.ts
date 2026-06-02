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
  // 카테고리 핵심값 (신청자 입력 — 관리자 등록 참고용)
  whiskyStyle?: WhiskyStyle | null
  wineType?: WineType | null
  cognacGrade?: CognacGrade | null
  otherType?: OtherSpiritType | null
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
