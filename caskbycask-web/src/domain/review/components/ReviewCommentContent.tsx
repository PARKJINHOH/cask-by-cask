import { sanitizeReviewComment } from '@/shared/utils/sanitize'
import { reviewCommentToHtml } from '../utils/reviewRichText'

interface Props {
  /** 리뷰 종합평가 원본 — 제한형 에디터 HTML 또는 에디터 도입 이전의 순수 텍스트 */
  value?: string | null
  className?: string
}

/**
 * 리뷰 종합평가 본문 출력.
 *
 * 공용 `RichContent` 는 이미지 라이트박스·술 카드 링크 복원처럼 리뷰에 없는 기능을 끌고 오므로
 * 쓰지 않는다. 레거시 순수 텍스트와 에디터 HTML 을 같은 모양으로 그린다.
 */
export default function ReviewCommentContent({ value, className }: Props) {
  const html = sanitizeReviewComment(reviewCommentToHtml(value))
  if (!html) return null
  return (
    <div
      className={['notice-content', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
