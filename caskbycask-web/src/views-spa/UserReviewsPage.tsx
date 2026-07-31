import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUserReviews, useUserReviewCategoryCounts, useDeleteMyReview } from '@/domain/review/hooks/useReviews'
import ReviewItem from '@/domain/review/components/ReviewItem'
import { useAuthStore } from '@/domain/auth/store/authStore'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from '@/shared/hooks/useDebouncedValue'
import { useNavigate } from 'react-router-dom'
import type { ReviewItem as ReviewItemType } from '@/domain/review/types/review.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

const PAGE_SIZE = 10
const CATEGORY_TABS: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']

export default function UserReviewsPage() {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const numericUserId = Number(userId)
  const nickname = searchParams.get('nickname') || `#${userId}`

  const [category, setCategory] = useState<SpiritCategory | null>(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [page, setPage] = useState(0)

  const debouncedKeyword = useDebouncedValue(keywordInput, SEARCH_DEBOUNCE_MS)

  // 카테고리·검색어가 바뀌면 항상 첫 페이지부터 다시 조회한다.
  useEffect(() => {
    setPage(0)
  }, [category, debouncedKeyword])

  const { data, isLoading, isFetching } = useUserReviews(numericUserId, {
    page,
    size: PAGE_SIZE,
    category,
    keyword: debouncedKeyword,
  })
  const { data: categoryCounts } = useUserReviewCategoryCounts(numericUserId)
  const deleteMutation = useDeleteMyReview()

  const reviews = useMemo(() => data?.content ?? [], [data])
  const totalElements = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0
  const overallTotal = categoryCounts?.total ?? 0
  const isFiltered = category !== null || debouncedKeyword.trim().length > 0

  const handleCategoryChange = (next: SpiritCategory | null) => {
    setCategory(next)
  }

  const handleEdit = (review: ReviewItemType) => {
    navigate(`/spirits/${review.spiritId}/review/${review.id}/edit`, { state: { review } })
  }

  const handleDelete = async (reviewId: number) => {
    if (!confirm(`${t('review.deleteConfirm')}\n\n${t('social.deleteSourceWarning')}`)) return
    const target = reviews.find((r) => r.id === reviewId)
    if (!target) return
    await deleteMutation.mutateAsync({ spiritId: target.spiritId, reviewId })
  }

  // 최초 로딩(카운트 미확정) 단계에서만 전체 스피너를 노출한다.
  if (isLoading && categoryCounts === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="text-primary-800" />
      </div>
    )
  }

  const tabButtonCls = (isActive: boolean, isDisabled: boolean) =>
    `flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200
    ${isDisabled
      ? 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
      : isActive
        ? 'bg-primary-800 text-white shadow-sm cursor-pointer'
        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 cursor-pointer'}`

  const badgeCls = (isActive: boolean, isDisabled: boolean) =>
    `text-xs font-bold tabular-nums ${isDisabled
      ? 'text-neutral-300'
      : isActive ? 'text-white/80' : 'text-neutral-400'}`

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* 타이틀 */}
      <div className="border-b border-neutral-100 pb-4">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          {t('review.userReviewsTitle', { nickname })}
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          {isFiltered
            ? t('review.filteredCount', { n: totalElements, total: overallTotal })
            : t('review.count', { n: overallTotal })}
        </p>
      </div>

      {overallTotal === 0 ? (
        <EmptyState
          title={t('review.userReviewsEmpty')}
          description={t('review.userReviewsEmptyDesc')}
        />
      ) : (
        <>
          {/* 카테고리 탭 + 주류 검색 */}
          <div className="space-y-3 border-b border-neutral-200 pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto no-scrollbar flex-nowrap scroll-smooth lg:flex-wrap lg:overflow-visible">
                <button
                  type="button"
                  onClick={() => handleCategoryChange(null)}
                  aria-pressed={category === null}
                  className={tabButtonCls(category === null, false)}
                >
                  {t('common.all')}
                  <span className={badgeCls(category === null, false)}>{overallTotal}</span>
                </button>
                {CATEGORY_TABS.map((tab) => {
                  const count = categoryCounts?.counts?.[tab] ?? 0
                  const isActive = category === tab
                  const isDisabled = count === 0 && !isActive
                  return (
                    <button
                      key={tab}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleCategoryChange(tab)}
                      aria-pressed={isActive}
                      className={tabButtonCls(isActive, isDisabled)}
                    >
                      {t(`spirit.category.${tab}`)}
                      <span className={badgeCls(isActive, isDisabled)}>{count}</span>
                    </button>
                  )
                })}
              </div>

              <form
                role="search"
                onSubmit={(e) => e.preventDefault()}
                className="relative w-full lg:w-72 flex-shrink-0"
              >
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder={t('review.searchSpiritPlaceholder')}
                  aria-label={t('review.searchSpiritAriaLabel')}
                  className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-9 text-sm text-neutral-800
                    placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100
                    [&::-webkit-search-cancel-button]:hidden"
                />
                {keywordInput && (
                  <button
                    type="button"
                    onClick={() => setKeywordInput('')}
                    aria-label={t('review.searchClear')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400
                      transition-colors hover:bg-neutral-100 hover:text-neutral-600 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* 리뷰 목록 */}
          {reviews.length === 0 ? (
            <EmptyState
              title={t('review.noFilterResult')}
              description={t('review.noFilterResultDesc')}
            />
          ) : (
            <div className={`space-y-4 transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
              {reviews.map((review) => (
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

          {/* 페이지네이션 — 페이지 최상단으로 스크롤 */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            scrollTarget="page"
            className="mt-6"
          />
        </>
      )}
    </div>
  )
}
