export interface ReviewItem {
  id: number
  userId: number
  nickname: string
  spiritId: number
  spiritNameKo: string
  spiritNameEn: string
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
}

export interface UpdateReviewRequest {
  noseScore?: number
  tasteScore?: number
  finishScore?: number
  noseNote?: string
  tasteNote?: string
  finishNote?: string
  comment?: string
}
