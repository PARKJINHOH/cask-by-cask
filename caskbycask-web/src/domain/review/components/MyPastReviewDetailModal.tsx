import { useTranslation } from 'react-i18next'
import Modal from '@/shared/components/Modal'
import { formatDate, formatScore, optionalScoreColor } from '@/shared/utils/format'
import type { ReviewItem } from '../types/review.types'
import { reviewSpiritLabel } from '../utils/reviewDisplay'
import ReviewCommentContent from './ReviewCommentContent'

export interface MyPastReviewDetailModalProps {
  /** null 이면 닫힌 상태 */
  review: ReviewItem | null
  onClose: () => void
  /** 지금 폼에 입력 중인 점수 — 있으면 과거 점수 옆에 나란히 비교한다. */
  currentNoseScore?: number | null
  currentTasteScore?: number | null
  currentFinishScore?: number | null
}

/** 과거 점수 → 지금 점수. 차이가 0이면 화살표와 증감을 숨긴다. */
function ScoreCompare({ past, current }: { past: number | null; current?: number | null }) {
  const { t } = useTranslation()
  // 예전 리뷰에 점수가 없으면 비교할 기준이 없다 — 증감은 그리지 않는다.
  const delta = current == null || past == null ? null : current - past

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-bold tabular-nums" style={{ color: optionalScoreColor(past) }}>
        {formatScore(past)}
      </span>
      {current != null && (
        <>
          <span aria-hidden="true" className="text-xs text-neutral-300">→</span>
          <span className="text-xs text-neutral-400">{t('review.pastReviews.writingNow')}</span>
          <span className="text-sm font-semibold tabular-nums text-neutral-600">
            {formatScore(current)}
          </span>
          {delta !== null && delta !== 0 && (
            <span
              className={`text-xs font-semibold tabular-nums ${delta > 0 ? 'text-primary-700' : 'text-neutral-400'}`}
            >
              ({delta > 0 ? '+' : ''}{delta.toFixed(1)})
            </span>
          )}
        </>
      )}
    </div>
  )
}

function PhaseBlock({
  label, score, note, currentScore,
}: {
  label: string
  score: number | null
  note: string | null
  currentScore?: number | null
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-neutral-900">{label}</span>
        <ScoreCompare past={score} current={currentScore} />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${score ?? 0}%`, backgroundColor: optionalScoreColor(score) }}
        />
      </div>
      {note && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">{note}</p>
      )}
    </div>
  )
}

/**
 * 사이드바에서 고른 내 과거 리뷰의 상세 — 읽기 전용.
 *
 * 작성 중인 폼 위에 뜨므로 주류 링크·수정·삭제 같은 이동 수단은 일부러 두지 않는다.
 * 잘못 눌러 페이지를 떠나면 작성 중이던 리뷰가 통째로 날아가기 때문이다.
 */
export default function MyPastReviewDetailModal({
  review,
  onClose,
  currentNoseScore,
  currentTasteScore,
  currentFinishScore,
}: MyPastReviewDetailModalProps) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  if (!review) return null

  const { title, editionValue } = reviewSpiritLabel(review, isEn)
  const currentTotal =
    currentNoseScore != null && currentTasteScore != null && currentFinishScore != null
      ? (currentNoseScore + currentTasteScore + currentFinishScore) / 3
      : undefined

  return (
    <Modal open onClose={onClose} title={title} size="xl">
      <div className="space-y-5">
        {editionValue && (
          <p className="-mt-1 text-xs font-semibold text-primary-700">{editionValue}</p>
        )}

        {/* 총점 비교 — 점수 보정의 기준점이라 맨 위에 둔다. */}
        <div className="flex items-baseline justify-between gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <span className="text-sm font-bold text-neutral-900">{t('review.total')}</span>
          <ScoreCompare past={review.totalScore} current={currentTotal} />
        </div>

        <PhaseBlock
          label={t('review.nose')}
          score={review.noseScore}
          note={review.noseNote}
          currentScore={currentNoseScore}
        />
        <PhaseBlock
          label={t('review.taste')}
          score={review.tasteScore}
          note={review.tasteNote}
          currentScore={currentTasteScore}
        />
        <PhaseBlock
          label={t('review.finish')}
          score={review.finishScore}
          note={review.finishNote}
          currentScore={currentFinishScore}
        />

        {review.comment && (
          <div className="border-t border-neutral-100 pt-4">
            <p className="mb-1.5 text-sm font-bold text-neutral-900">{t('review.overall')}</p>
            <ReviewCommentContent
              value={review.comment}
              className="text-sm leading-relaxed text-neutral-700"
            />
          </div>
        )}

        <p className="text-xs text-neutral-400">{formatDate(review.createdAt, i18n.language)}</p>
      </div>
    </Modal>
  )
}
