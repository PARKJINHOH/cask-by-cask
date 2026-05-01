import { useState, useEffect } from 'react'
import { useAuthStore } from '@/domain/auth/store/authStore'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import Button from '@/shared/components/Button'
import ReviewItem from './ReviewItem'
import ReviewForm from './ReviewForm'
import { useReviews, useDeleteReview } from '../hooks/useReviews'
import type { ReviewItem as ReviewItemType } from '../types/review.types'

interface ReviewListProps {
  spiritId: number
  onNeedLogin: () => void
}

export default function ReviewList({ spiritId, onNeedLogin }: ReviewListProps) {
  const user = useAuthStore((s) => s.user)
  const [page, setPage]                 = useState(0)
  const [showForm, setShowForm]         = useState(false)
  const [editingReview, setEditingReview] = useState<ReviewItemType | null>(null)
  const [hasReviewed, setHasReviewed]   = useState(false)

  const { data, isLoading } = useReviews(spiritId, page)
  const deleteMutation      = useDeleteReview(spiritId)

  // Detect if the current user has a review on this page
  useEffect(() => {
    if (!user || !data) return
    if (data.content.some((r) => r.userId === user.id)) setHasReviewed(true)
  }, [data, user])

  const handleWriteClick = () => {
    if (!user) { onNeedLogin(); return }
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingReview(null)
    setHasReviewed(true)
    setPage(0)
  }

  const handleEdit = (review: ReviewItemType) => {
    setEditingReview(review)
    setShowForm(false)
  }

  const handleDelete = async (reviewId: number) => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return
    await deleteMutation.mutateAsync(reviewId)
    setHasReviewed(false)
  }

  return (
    <div className="space-y-4">
      {/* Write / editing form */}
      {editingReview ? (
        <ReviewForm
          spiritId={spiritId}
          editingReview={editingReview}
          onSuccess={handleFormSuccess}
          onCancel={() => setEditingReview(null)}
        />
      ) : showForm ? (
        <ReviewForm
          spiritId={spiritId}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        user && !hasReviewed && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleWriteClick}>
              리뷰 작성
            </Button>
          </div>
        )
      )}

      {/* Login prompt for guests */}
      {!user && (
        <button
          onClick={onNeedLogin}
          className="w-full py-3 border border-dashed border-neutral-300 rounded-xl
            text-sm text-neutral-400 hover:text-primary-600 hover:border-primary-300 transition-colors"
        >
          로그인하고 리뷰를 작성해보세요 →
        </button>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-primary-600" />
        </div>
      ) : !data || data.empty ? (
        <EmptyState title="아직 리뷰가 없습니다." description="첫 번째 리뷰를 작성해보세요!" />
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
