import type { ReviewItem, VariantReviewRequestItem } from '../types/review.types'

/**
 * 리뷰 카드/수정 페이지의 주류 표기 규칙.
 *
 * - 제목: `주류명 + 시리즈 식별자` (에디션이 없는 주류는 주류명만)
 * - 부제: `식별 값` — 브랜드 색으로 작게 표시한다
 *
 * 서버(`SpiritSlugUtils.displayNameKo`)의 표시명 조합과 동일한 규칙이며,
 * 에디션이 아닌 주류는 서버가 에디션 필드를 null 로 내려준다.
 */
export interface SpiritEditionLabel {
  /** 주류명 + 시리즈 식별자 */
  title: string
  /** 에디션 식별 값 (없으면 null) */
  editionValue: string | null
}

function firstNonBlank(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value && value.trim()) return value.trim()
  }
  return ''
}

/** 승인된 리뷰(ReviewItem) 의 주류 표기 */
export function reviewSpiritLabel(review: ReviewItem, isEn: boolean): SpiritEditionLabel {
  const name = isEn
    ? firstNonBlank(review.spiritNameEn, review.spiritNameKo)
    : firstNonBlank(review.spiritNameKo, review.spiritNameEn)
  const series = isEn
    ? firstNonBlank(review.spiritSeriesIdentifierEn, review.spiritSeriesIdentifier)
    : firstNonBlank(review.spiritSeriesIdentifier, review.spiritSeriesIdentifierEn)
  const value = isEn
    ? firstNonBlank(review.spiritVariantValueEn, review.spiritVariantValue)
    : firstNonBlank(review.spiritVariantValue, review.spiritVariantValueEn)

  return {
    title: [name, series].filter(Boolean).join(' '),
    editionValue: value || null,
  }
}

/** 하위 에디션 요청(VariantReviewRequestItem) 의 주류 표기 */
export function variantRequestSpiritLabel(
  request: VariantReviewRequestItem,
  isEn: boolean,
): SpiritEditionLabel {
  const name = isEn
    ? firstNonBlank(request.masterNameEn, request.masterNameKo)
    : firstNonBlank(request.masterNameKo, request.masterNameEn)
  const series = isEn
    ? firstNonBlank(request.seriesIdentifierEn, request.seriesIdentifier)
    : firstNonBlank(request.seriesIdentifier, request.seriesIdentifierEn)
  const value = isEn
    ? firstNonBlank(request.variantValueEn, request.variantValue)
    : firstNonBlank(request.variantValue, request.variantValueEn)

  return {
    title: [name, series].filter(Boolean).join(' '),
    editionValue: value || null,
  }
}
