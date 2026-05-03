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
  comment: string | null
  createdAt: string
}

export interface CreateReviewRequest {
  noseScore: number
  tasteScore: number
  finishScore: number
  comment?: string
}

export interface UpdateReviewRequest {
  noseScore?: number
  tasteScore?: number
  finishScore?: number
  comment?: string
}
