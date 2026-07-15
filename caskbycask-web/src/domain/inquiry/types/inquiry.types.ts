export type InquiryCategory =
  | 'BUG_REPORT' | 'FEATURE_REQUEST' | 'ACCOUNT_INQUIRY' | 'CORRECTION_REQUEST' | 'PARTNERSHIP_INQUIRY' | 'OTHER'
export type InquiryStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'

export interface InquiryListResponse {
  id: number
  category: InquiryCategory
  title: string
  senderEmail: string
  hasAttachments: boolean
  status: InquiryStatus
  createdAt: string
}

export interface InquiryDetailResponse {
  id: number
  category: InquiryCategory
  title: string
  body: string
  senderEmail: string
  attachments: InquiryAttachment[]
  status: InquiryStatus
  adminNote: string | null
  replyBody: string | null
  repliedBy: string | null
  repliedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InquiryAttachment {
  fileKey: string
  originalFilename: string
  contentType: string
  size: number
}
