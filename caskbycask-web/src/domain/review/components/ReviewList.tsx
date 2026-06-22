import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/domain/auth/store/authStore'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import Button from '@/shared/components/Button'
import ReviewItem from './ReviewItem'
import { useReviews, useDeleteReview } from '../hooks/useReviews'
import type { ReviewItem as ReviewItemType } from '../types/review.types'

interface ReviewListProps {
  spiritId: number
  onNeedLogin: () => void
}

export default function ReviewList({ spiritId, onNeedLogin }: ReviewListProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [page, setPage]               = useState(0)

  const { data, isLoading } = useReviews(spiritId, page)
  const deleteMutation      = useDeleteReview(spiritId)

  const handleWriteClick = () => {
    if (!user) { onNeedLogin(); return }
    navigate(`/spirits/${spiritId}/review/write`)
  }

  const handleEdit = (review: ReviewItemType) => {
    navigate(`/spirits/${spiritId}/review/${review.id}/edit`, { state: { review } })
  }

  const handleDelete = async (reviewId: number) => {
    if (!confirm(t('review.deleteConfirm'))) return
    await deleteMutation.mutateAsync(reviewId)
  }

  return (
    <div className="space-y-4">
      {/* Write button */}
      {user && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleWriteClick}>
            {t('review.write')}
          </Button>
        </div>
      )}

      {/* Login prompt for guests */}
      {!user && (
        <button
          onClick={onNeedLogin}
          className="w-full py-3 border border-dashed border-neutral-300 rounded-xl
            text-sm text-neutral-400 hover:text-primary-800 hover:border-primary-300 transition-colors"
        >
          {t('review.loginPrompt')}
        </button>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-primary-800" />
        </div>
      ) : !data || data.empty ? (
        <EmptyState title={t('review.noReview')} description={t('review.noReviewDesc')} />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                currentUserId={user?.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
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

    </div>
  )
}
