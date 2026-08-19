import type { PhotoCardDraft } from '@/domain/photo-card/utils/photoCardDraft'
import type { AromaProfile, ReviewImageItem } from '../types/review.types'

export interface ReviewShareData {
  id: number
  spiritId: number
  spiritNameKo: string
  spiritNameEn: string
  nickname: string
  noseScore: number | null
  tasteScore: number | null
  finishScore: number | null
  totalScore: number | null
  noseNote: string | null
  tasteNote: string | null
  finishNote: string | null
  comment: string | null
  createdAt: string
  images: ReviewImageItem[]
  aromaProfiles: AromaProfile[]
}

export type ReviewShareImageSource = 'SPIRIT' | 'REVIEW' | 'UPLOAD'
export type ReviewShareImagePlacement = 'PORTRAIT' | 'LANDSCAPE'
export type ReviewShareCardLength = 'AUTO' | 'TALL'

export interface ReviewPhotoCardContent {
  brand: string
  spiritNameKo: string
  spiritNameEn: string
  scoreLabel: string
  total: string
  infoCategoryLabel: string
  infoOriginLabel: string
  infoAbvLabel: string
  infoAgedLabel: string
  infoProducerLabel: string
  category: string
  country: string
  region: string
  abv: string
  detail: string
  producer: string
  noseLabel: string
  tasteLabel: string
  finishLabel: string
  nose: string
  taste: string
  finish: string
  noseNote: string
  tasteNote: string
  finishNote: string
  tastingNotesTitle: string
  overallTitle: string
  overall: string
  aromaNose: string
  aromaTaste: string
  aromaFinish: string
  tastingProfileTitle: string
  attribution: string
  home: string
}

export interface ReviewPhotoCardRouteState {
  reviewPhotoCardDraft: PhotoCardDraft
  reviewPhotoCardSourceId: number
}
