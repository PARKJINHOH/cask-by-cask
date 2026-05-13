import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, scoreColor } from '@/shared/utils/format'
import Modal from '@/shared/components/Modal'
import type { ReviewItem as ReviewItemType } from '../types/review.types'

// ── 점수 바 (목록용: note 2줄 제한) ──────────────────────────────

interface ScoreBarProps {
  label: string
  value: number
  note?: string | null
}

function ScoreBar({ label, value, note }: ScoreBarProps) {
  const color = scoreColor(value)
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-14 text-xs text-neutral-400 flex-shrink-0">{label}</span>
        <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>
        <span className="w-9 text-xs font-semibold text-right tabular-nums" style={{ color }}>
          {Number(value).toFixed(1)}
        </span>
      </div>
      {note && (
        <p className="text-xs text-neutral-500 leading-relaxed pl-16 line-clamp-2">
          {note}
        </p>
      )}
    </div>
  )
}

// ── 리뷰 상세 모달 ──────────────────────────────────────────────

interface ReviewDetailModalProps {
  review: ReviewItemType
  open: boolean
  onClose: () => void
}

function ReviewDetailModal({ review, open, onClose }: ReviewDetailModalProps) {
  const { t, i18n } = useTranslation()
  const scores = [
    { label: t('review.nose'),   score: review.noseScore,   note: review.noseNote },
    { label: t('review.taste'),  score: review.tasteScore,  note: review.tasteNote },
    { label: t('review.finish'), score: review.finishScore, note: review.finishNote },
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('review.detailTitle')} size="md">
      <div className="space-y-5">
        {/* 작성자 / 총점 */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <p className="text-sm font-semibold text-neutral-900">{review.nickname}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{formatDate(review.createdAt, i18n.language)}</p>
          </div>
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: scoreColor(review.totalScore) }}
          >
            {Number(review.totalScore).toFixed(1)}
          </span>
        </div>

        {/* 향 / 맛 / 피니시 */}
        <div className="space-y-4">
          {scores.map(({ label, score, note }) => (
            <div key={label}>
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-xs font-semibold text-neutral-500 w-24 flex-shrink-0">
                  {label}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${score}%`, backgroundColor: scoreColor(score) }}
                  />
                </div>
                <span
                  className="text-sm font-bold tabular-nums w-9 text-right"
                  style={{ color: scoreColor(score) }}
                >
                  {Number(score).toFixed(1)}
                </span>
              </div>
              {note && (
                <p className="text-sm text-neutral-700 leading-relaxed pl-[6.5rem]">{note}</p>
              )}
            </div>
          ))}
        </div>

        {/* 기타 코멘트 */}
        {review.comment && (
          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-semibold text-neutral-400 mb-2">{t('review.comment')}</p>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {review.comment}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── 리뷰 카드 ───────────────────────────────────────────────────

export interface ReviewItemProps {
  review: ReviewItemType
  currentUserId?: number
  onEdit: (review: ReviewItemType) => void
  onDelete: (id: number) => void
}

export default function ReviewItem({ review, currentUserId, onEdit, onDelete }: ReviewItemProps) {
  const { t, i18n } = useTranslation()
  const [detailOpen, setDetailOpen] = useState(false)
  const isOwner = !!currentUserId && currentUserId === review.userId

  const hasNotes = !!(review.noseNote || review.tasteNote || review.finishNote || review.comment)

  return (
    <>
      <article className="p-4 bg-white rounded-xl border border-neutral-100 space-y-3">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm font-semibold text-neutral-900">{review.nickname}</span>
            <span className="ml-2 text-xs text-neutral-400">{formatDate(review.createdAt, i18n.language)}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className="text-xl font-bold tabular-nums"
              style={{ color: scoreColor(review.totalScore) }}
            >
              {Number(review.totalScore).toFixed(1)}
            </span>
            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(review)}
                  className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => onDelete(review.id)}
                  className="text-xs text-danger-400 hover:text-danger-600 transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 점수 바 + 노트 (2줄 제한) */}
        <div className="space-y-2.5">
          <ScoreBar label={t('review.nose')}   value={review.noseScore}   note={review.noseNote} />
          <ScoreBar label={t('review.taste')}  value={review.tasteScore}  note={review.tasteNote} />
          <ScoreBar label={t('review.finish')} value={review.finishScore} note={review.finishNote} />
        </div>

        {/* 코멘트 미리보기 (2줄) */}
        {review.comment && (
          <p className="text-sm text-neutral-700 leading-relaxed border-t border-neutral-50 pt-2 line-clamp-2">
            {review.comment}
          </p>
        )}

        {/* 상세보기 버튼 */}
        {hasNotes && (
          <div className="pt-1">
            <button
              onClick={() => setDetailOpen(true)}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
            >
              {t('review.viewAll')}
            </button>
          </div>
        )}
      </article>

      <ReviewDetailModal
        review={review}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </>
  )
}
