import { formatDate, scoreColor } from '@/shared/utils/format'
import type { ReviewItem as ReviewItemType } from '../types/review.types'

interface ScoreBarProps { label: string; value: number }

function ScoreBar({ label, value }: ScoreBarProps) {
  const color = scoreColor(value)
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-xs text-neutral-400 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-7 text-xs font-semibold text-right tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

export interface ReviewItemProps {
  review: ReviewItemType
  currentUserId?: number
  onEdit: (review: ReviewItemType) => void
  onDelete: (id: number) => void
}

export default function ReviewItem({ review, currentUserId, onEdit, onDelete }: ReviewItemProps) {
  const isOwner = !!currentUserId && currentUserId === review.userId

  return (
    <article className="p-4 bg-white rounded-xl border border-neutral-100 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-neutral-900">{review.nickname}</span>
          <span className="ml-2 text-xs text-neutral-400">{formatDate(review.createdAt)}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color: scoreColor(review.totalScore) }}
          >
            {review.totalScore.toFixed(1)}
          </span>
          {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(review)}
                className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                수정
              </button>
              <button
                onClick={() => onDelete(review.id)}
                className="text-xs text-danger-400 hover:text-danger-600 transition-colors"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Score bars */}
      <div className="space-y-1.5">
        <ScoreBar label="향 (Nose)" value={review.noseScore} />
        <ScoreBar label="맛 (Taste)" value={review.tasteScore} />
        <ScoreBar label="피니시" value={review.finishScore} />
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-neutral-700 leading-relaxed border-t border-neutral-50 pt-2">
          {review.comment}
        </p>
      )}
    </article>
  )
}
