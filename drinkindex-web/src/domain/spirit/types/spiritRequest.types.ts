import type { SpiritCategory } from './spirit.types'

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface SpiritRegisterRequestForm {
  nameKo: string
  nameEn: string
  category: SpiritCategory
  distilleryId?: number | null
  abv?: number | null
  country?: string
  region?: string
  bottler?: string
  bottledYear?: number | null
  vintageYear?: number | null
  volumeMl?: number | null
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
