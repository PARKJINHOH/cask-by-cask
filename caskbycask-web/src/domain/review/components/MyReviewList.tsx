import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import ReviewFormModal from './ReviewFormModal'
import { useMyReviews, useDeleteMyReview } from '../hooks/useReviews'
import { scoreColor, formatDate } from '@/shared/utils/format'
import type { ReviewItem } from '../types/review.types'
import { getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs text-neutral-400 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${value}%`, backgroundColor: scoreColor(value) }}
        />
      </div>
      <span
        className="w-7 text-xs font-semibold text-right tabular-nums"
        style={{ color: scoreColor(value) }}
      >
        {value}
      </span>
    </div>
  )
}

export default function MyReviewList() {
  const { t, i18n } = useTranslation()
  const [page, setPage]                     = useState(0)
  const [editingReview, setEditingReview]   = useState<ReviewItem | null>(null)

  const { data, isLoading } = useMyReviews(page)
  const deleteMutation      = useDeleteMyReview()

  const handleDelete = async (review: ReviewItem) => {
    if (!confirm(`"${review.spiritNameKo}" 리뷰를 삭제하시겠습니까?`)) return
    await deleteMutation.mutateAsync({ spiritId: review.spiritId, reviewId: review.id })
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary-800" />
        </div>
      ) : !data || data.empty ? (
        <EmptyState
          title={t('mypage.reviews.empty')}
          description={t('mypage.reviews.emptyDesc')}
          className="border border-neutral-200 rounded-2xl bg-white"
        />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((review) => (
              <article
                key={review.id}
                className="p-4 bg-white rounded-xl border border-neutral-100 space-y-3"
              >
                {/* Header: spirit name + score + actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={getSpiritDetailPath({
                        id: review.spiritId,
                        spiritCanonicalPathKo: review.spiritCanonicalPathKo,
                        spiritCanonicalPathEn: review.spiritCanonicalPathEn,
                      }, i18n.language)}
                      className="text-sm font-semibold text-neutral-900 hover:text-primary-800
                        transition-colors line-clamp-1 block"
                    >
                      {review.spiritNameKo}
                    </Link>
                    <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                      {review.spiritNameEn}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-xl font-bold tabular-nums"
                      style={{ color: scoreColor(review.totalScore) }}
                    >
                      {review.totalScore.toFixed(1)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingReview(review)}
                        className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(review)}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors
                          disabled:opacity-40"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>

                {/* Score bars */}
                <div className="space-y-1.5">
                  <ScoreBar label="향" value={review.noseScore} />
                  <ScoreBar label="맛" value={review.tasteScore} />
                  <ScoreBar label="피니시" value={review.finishScore} />
                </div>

                {/* Comment preview */}
                {review.comment && (
                  <p className="text-xs text-neutral-600 line-clamp-2 border-t border-neutral-50 pt-2 leading-relaxed">
                    {review.comment}
                  </p>
                )}

                <p className="text-xs text-neutral-400">{formatDate(review.createdAt)}</p>
              </article>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      {editingReview && (
        <ReviewFormModal
          open
          onClose={() => setEditingReview(null)}
          onSuccess={() => setPage(0)}
          spiritId={editingReview.spiritId}
          editingReview={editingReview}
        />
      )}
    </div>
  )
}
