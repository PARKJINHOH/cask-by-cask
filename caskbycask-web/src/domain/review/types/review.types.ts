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
