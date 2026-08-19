import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'


export interface ReviewImageItem {
  id: number
  imageUrl: string
  sortOrder: number
}

export interface ReviewImagePlanItem {
  imageId?: number
  fileIndex?: number
}

export type AromaProfilePhase = 'NOSE' | 'PALATE' | 'FINISH'
export type AromaProfileAromaType = 'ID' | 'CUSTOM'

export interface AromaProfileItem {
  aromaType: AromaProfileAromaType
  aromaKey: string
  labelSnapshot: string
  intensity: number
}

export interface AromaProfile {
  phase: AromaProfilePhase
  schemaVersion: 1
  items: AromaProfileItem[]
}

export type SpiritVariantType = 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE'

export interface ReviewItem {
  id: number
  userId: number
  nickname: string
  spiritId: number
  spiritNameKo: string
  spiritNameEn: string
  spiritCategory: SpiritCategory
  spiritCanonicalPathKo?: string | null
  spiritCanonicalPathEn?: string | null
  /** 하위 에디션 리뷰일 때만 채워진다 (마스터/단일 주류는 null) */
  spiritVariantType?: SpiritVariantType | null
  spiritSeriesIdentifier?: string | null
  spiritSeriesIdentifierEn?: string | null
  spiritVariantValue?: string | null
  spiritVariantValueEn?: string | null
  spiritAbv?: number | null
  spiritVolumeMl?: number | null
  noseScore: number | null
  tasteScore: number | null
  finishScore: number | null
  totalScore: number | null
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
  legacySocialPublishAllowed: boolean
  userReviewIndex?: number
  userReviewCount?: number
  images: ReviewImageItem[]
  aromaProfiles?: AromaProfile[]
}

/** 사용자 공개 리뷰의 카테고리별 개수 (GET /api/users/{userId}/reviews/category-counts) */
export interface UserReviewCategoryCounts {
  total: number
  /** 4개 카테고리 전부 포함 — 리뷰가 없는 카테고리는 0 */
  counts: Record<SpiritCategory, number>
}

/** 메인 "최근 등록된 리뷰" 카드 항목 (GET /api/public/reviews/recent) */
export interface RecentReviewItem {
  id: number
  spiritId: number
  displayNameKo: string
  displayNameEn: string | null
  canonicalPathKo?: string | null
  canonicalPathEn?: string | null
  imageUrl: string | null
  nickname: string
  totalScore: number | null
  createdAt: string
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
  noseScore: number | null
  tasteScore: number | null
  finishScore: number | null
  totalScore: number | null
  noseNote: string | null
  tasteNote: string | null
  finishNote: string | null
  comment: string | null
  createdAt: string
}

export interface CreateReviewRequest {
  noseScore: number | null
  tasteScore: number | null
  finishScore: number | null
  noseNote?: string
  tasteNote?: string
  finishNote?: string
  comment?: string
  noseAromaWheelNotes?: string
  tasteAromaWheelNotes?: string
  finishAromaWheelNotes?: string
  aromaProfiles?: AromaProfile[]
  socialPublish?: SocialPublishSelection
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
  masterCategory?: SpiritCategory | null
  variantType: SpiritVariantType | null
  seriesIdentifier: string | null
  seriesIdentifierEn: string | null
  variantValue: string
  variantValueEn: string | null
  abv: number
  volumeMl: number
  requestMemo: string | null
  noseScore: number | null
  tasteScore: number | null
  finishScore: number | null
  totalScore: number | null
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
  images: ReviewImageItem[]
  aromaProfiles?: AromaProfile[]
}

export interface UpdateReviewRequest {
  /**
   * 점수 세 칸은 다른 필드와 달리 "생략 = 유지"가 아니라 통째로 갈아 끼운다.
   * 세 칸 모두 null 로 보내면 점수를 지운 리뷰가 된다 (평균에서 빠짐).
   */
  noseScore: number | null
  tasteScore: number | null
  finishScore: number | null
  noseNote?: string
  tasteNote?: string
  finishNote?: string
  comment?: string
  noseAromaWheelNotes?: string
  tasteAromaWheelNotes?: string
  finishAromaWheelNotes?: string
  aromaProfiles?: AromaProfile[]
}
import type { SocialPublishSelection } from '@/domain/social/types/social.types'
