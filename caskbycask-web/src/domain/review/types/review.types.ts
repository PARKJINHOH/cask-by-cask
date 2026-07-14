export interface ReviewItem {
  id: number
  userId: number
  nickname: string
  spiritId: number
  spiritNameKo: string
  spiritNameEn: string
  spiritCanonicalPathKo?: string | null
  spiritCanonicalPathEn?: string | null
  noseScore: number
  tasteScore: number
  finishScore: number
  totalScore: number
  noseNote: string | null
  tasteNote: string | null
  finishNote: string | null
  comment: string | null
  noseAromaWheelNotes: string | null
  tasteAromaWheelNotes: string | null
  finishAromaWheelNotes: string | null
  createdAt: string
  userLevel?: number
  userProfileImageUrl?: string | null
  userRole?: string
  userReviewIndex?: number
  userReviewCount?: number
}

export interface ReviewEmbedItem {
  id: number
  spiritId: number
  spiritNameKo: string
  spiritNameEn: string | null
  spiritIdentifierKo: string | null
  spiritIdentifierEn: string | null
  spiritAbv: number | null
  spiritReviewCount: number
  noseScore: number
  tasteScore: number
  finishScore: number
  totalScore: number
  noseNote: string | null
  tasteNote: string | null
  finishNote: string | null
  comment: string | null
  createdAt: string
}

export interface CreateReviewRequest {
  noseScore: number
  tasteScore: number
  finishScore: number
  noseNote?: string
  tasteNote?: string
  finishNote?: string
  comment?: string
  noseAromaWheelNotes?: string
  tasteAromaWheelNotes?: string
  finishAromaWheelNotes?: string
}

export interface CreateVariantReviewRequest extends CreateReviewRequest {
  variantValue: string
  variantValueEn?: string | null
  abv: number
  volumeMl: number
  requestMemo?: string | null
}

export type VariantReviewRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED'

export interface VariantReviewRequestItem {
  id: number
  masterSpiritId: number
  masterNameKo: string
  masterNameEn: string
  masterCanonicalPathKo?: string | null
  masterCanonicalPathEn?: string | null
  variantType: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE' | null
  seriesIdentifier: string | null
  seriesIdentifierEn: string | null
  variantValue: string
  variantValueEn: string | null
  abv: number
  volumeMl: number
  requestMemo: string | null
  noseScore: number
  tasteScore: number
  finishScore: number
  totalScore: number
  noseNote: string | null
  tasteNote: string | null
  finishNote: string | null
  comment: string | null
  noseAromaWheelNotes: string | null
  tasteAromaWheelNotes: string | null
  finishAromaWheelNotes: string | null
  status: VariantReviewRequestStatus
  linkedVariantId: number | null
  reviewId: number | null
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface UpdateReviewRequest {
  noseScore?: number
  tasteScore?: number
  finishScore?: number
  noseNote?: string
  tasteNote?: string
  finishNote?: string
  comment?: string
  noseAromaWheelNotes?: string
  tasteAromaWheelNotes?: string
  finishAromaWheelNotes?: string
}
