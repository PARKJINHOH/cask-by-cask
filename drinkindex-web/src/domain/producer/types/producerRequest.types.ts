import type { RequestStatus } from '@/domain/spirit/types/spiritRequest.types'
import type { ProducerType } from './producer.types'

export interface ProducerRegisterRequestForm {
  type: ProducerType
  nameKo: string
  nameEn: string
  country: string
  region?: string
}

export interface MyProducerRequest {
  id: number
  type?: ProducerType
  nameKo: string
  nameEn: string
  country: string
  status: RequestStatus
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
}
