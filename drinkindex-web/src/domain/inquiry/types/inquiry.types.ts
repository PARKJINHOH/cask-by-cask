export type InquiryCategory = 'BUG_REPORT' | 'FEATURE_REQUEST' | 'ACCOUNT_INQUIRY' | 'OTHER'
export type InquiryStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'

export interface InquiryListResponse {
  id: number
  category: InquiryCategory
  title: string
  senderEmail: string
  hasImages: boolean
  status: InquiryStatus
  createdAt: string
}

export interface InquiryDetailResponse {
  id: number
  category: InquiryCategory
  title: string
  body: string
  senderEmail: string
  imageUrls: string[]
  status: InquiryStatus
  adminNote: string | null
  replyBody: string | null
  createdAt: string
  updatedAt: string
}
