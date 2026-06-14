import type { RequestStatus } from '@/domain/spirit/types/spiritRequest.types'
import type { ProducerType } from './producer.types'

export interface ProducerRegisterRequestForm {
  type: ProducerType
  nameKo: string
  nameEn: string
  country: string
  region?: string
  website?: string
  foundedYear?: number | ''
  descriptionKo?: string
  descriptionEn?: string
}

/** 관리자가 등록 요청을 수정할 때 전송하는 페이로드 (백엔드 ProducerRegisterRequestBody 와 1:1) */
export interface UpdateProducerRequestPayload {
  type?: ProducerType
  nameKo: string
  nameEn: string
  country: string
  region?: string | null
  website?: string | null
  foundedYear?: number | null
  descriptionKo?: string | null
  descriptionEn?: string | null
}

export interface MyProducerRequest {
  id: number
  requesterId?: number | null
  requesterNickname?: string | null
  type?: ProducerType
  nameKo: string
  nameEn: string
  country: string
  region?: string | null
  status: RequestStatus
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
  website?: string | null
  foundedYear?: number | null
  descriptionKo?: string | null
  descriptionEn?: string | null
}
