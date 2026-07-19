import { useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUserReviews, useDeleteMyReview } from '@/domain/review/hooks/useReviews'
import ReviewItem from '@/domain/review/components/ReviewItem'
import { useAuthStore } from '@/domain/auth/store/authStore'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import { useNavigate } from 'react-router-dom'
import type { ReviewItem as ReviewItemType } from '@/domain/review/types/review.types'

export default function UserReviewsPage() {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const nickname = searchParams.get('nickname') || `#${userId}`
  const [activeTab, setActiveTab] = useState<string>('all')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const { data, isLoading } = useUserReviews(Number(userId))
  const deleteMutation = useDeleteMyReview()

  const reviews = useMemo(() => data?.content ?? [], [data])

  // Extract unique spirits from user's reviews
  const spiritTabs = useMemo(() => {
    const tabs = [{ id: 'all', name: t('common.all', '전체') }]
    const seen = new Set<string>()

    reviews.forEach((r) => {
      const name = i18n.language === 'en' ? (r.spiritNameEn || r.spiritNameKo) : r.spiritNameKo
      if (!seen.has(name)) {
        seen.add(name)
        tabs.push({ id: name, name })
      }
    })
    return tabs
  }, [reviews, i18n.language, t])

  // Filter reviews based on active tab
  const filteredReviews = useMemo(() => {
    if (activeTab === 'all') return reviews
    return reviews.filter((r) => {
      const name = i18n.language === 'en' ? (r.spiritNameEn || r.spiritNameKo) : r.spiritNameKo
      return name === activeTab
    })
  }, [reviews, activeTab, i18n.language])

  // Reset page when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setPage(0)
  }

  const handleEdit = (review: ReviewItemType) => {
    navigate(`/spirits/${review.spiritId}/review/${review.id}/edit`, { state: { review } })
  }

  const handleDelete = async (reviewId: number) => {
    if (!confirm(t('review.deleteConfirm'))) return
    const rev = reviews.find((r) => r.id === reviewId)
    if (!rev) return
    await deleteMutation.mutateAsync({ spiritId: rev.spiritId, reviewId })
  }

  // Paginated reviews
  const totalPages = Math.ceil(filteredReviews.length / pageSize)
  const paginatedReviews = useMemo(() => {
    return filteredReviews.slice(page * pageSize, (page + 1) * pageSize)
  }, [filteredReviews, page])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="text-primary-800" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Title */}
      <div className="border-b border-neutral-100 pb-4">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          {t('review.userReviewsTitle', { nickname })}
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          {t('review.count', { n: filteredReviews.length })}
        </p>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title={t('review.userReviewsEmpty')}
          description={t('review.noReviewDesc', '아직 작성한 리뷰가 없습니다.')}
        />
      ) : (
        <>
          {/* Scrollable Pills Tab List */}
          <div className="border-b border-neutral-200">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 -mb-px flex-nowrap scroll-smooth">
              {spiritTabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 cursor-pointer
                      ${isActive
                        ? 'bg-primary-800 text-white shadow-sm scale-102'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                      }`}
                  >
                    {tab.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reviews List */}
          {paginatedReviews.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              {t('review.noReview', '리뷰가 없습니다.')}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedReviews.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  currentUserId={user?.id}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  showSpiritName={true}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="mt-6"
            />
          )}
        </>
      )}
    </div>
  )
}
