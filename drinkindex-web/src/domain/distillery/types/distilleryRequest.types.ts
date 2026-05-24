import type { RequestStatus } from '@/domain/spirit/types/spiritRequest.types'

export interface DistilleryRegisterRequestForm {
  nameKo: string
  nameEn: string
  country: string
  region?: string
}

export interface MyDistilleryRequest {
  id: number
  nameKo: string
  nameEn: string
  country: string
  status: RequestStatus
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
}
