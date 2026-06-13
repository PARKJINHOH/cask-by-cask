export type LegalDocumentType = 'TERMS' | 'PRIVACY_POLICY'

export const LEGAL_TYPE_LABELS: Record<LegalDocumentType, string> = {
  TERMS: '이용약관',
  PRIVACY_POLICY: '개인정보 처리방침',
}

export interface LegalDocumentListItem {
  id: number
  type: LegalDocumentType
  version: string
  isActive: boolean
  authorNickname: string | null
  createdAt: string
}

export interface LegalDocumentResponse {
  id: number
  type: LegalDocumentType
  version: string
  content: string | null
  contentSanitized: string
  isActive: boolean
  authorNickname: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateLegalDocumentRequest {
  type: LegalDocumentType
  version: string
  content: string
}

export interface UpdateLegalDocumentRequest {
  version: string
  content: string
}
