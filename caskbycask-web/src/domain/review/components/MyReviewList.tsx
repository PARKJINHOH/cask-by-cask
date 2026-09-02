import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import ReviewCategoryTabs from './ReviewCategoryTabs'
import {
  useDeleteMyReview,
  useDeleteMyReviewRequest,
  useMyReviewCategoryCounts,
  useMyReviewRequestCategoryCounts,
  useMyReviewRequests,
  useMyReviews,
} from '../hooks/useReviews'
import { formatDate, formatScore, optionalScoreColor, NO_SCORE_TEXT } from '@/shared/utils/format'
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from '@/shared/hooks/useDebouncedValue'
import type { MyReviewSort, ReviewItem, VariantReviewRequestItem } from '../types/review.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import { getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
import { reviewCommentToText } from '../utils/reviewRichText'
import { reviewSpiritLabel, variantRequestSpiritLabel } from '../utils/reviewDisplay'
import { myReviewEditPath, myReviewRequestEditPath } from '../utils/reviewRoutes'
import ReviewImageStrip from './ReviewImageStrip'
import ReviewSocialLinks from './ReviewSocialLinks'
import { useSourceSocialPublications } from '@/domain/social/hooks/useSocialPublications'

type ReviewTab = 'approved' | 'pending' | 'rejected'

const SORT_VALUES: MyReviewSort[] = ['LATEST', 'OLDEST', 'SCORE_DESC', 'SCORE_ASC', 'NAME_ASC', 'NAME_DESC']

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs text-neutral-400 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${value ?? 0}%`, backgroundColor: optionalScoreColor(value) }}
        />
      </div>
      <span
        className="w-7 text-xs font-semibold text-right tabular-nums"
        style={{ color: optionalScoreColor(value) }}
      >
        {value ?? NO_SCORE_TEXT}
      </span>
    </div>
  )
}

/** 에디션 식별 값 — 브랜드 색으로 작게 표기 */
function EditionValue({ value }: { value: string }) {
  return <p className="mt-0.5 text-xs font-semibold text-primary-700">{value}</p>
}

export default function MyReviewList() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isEn = i18n.language === 'en'

  const [activeTab, setActiveTab] = useState<ReviewTab>('approved')
  const [category, setCategory] = useState<SpiritCategory | null>(null)
  // 정렬·검색은 승인 리뷰 탭에만 있다 — 대기·반려는 별도 엔티티(에디션 요청)라 서버가 받지 않는다.
  const [sort, setSort] = useState<MyReviewSort>('LATEST')
  const [keywordInput, setKeywordInput] = useState('')
  const [approvedPage, setApprovedPage] = useState(0)
  const [pendingPage, setPendingPage] = useState(0)
  const [rejectedPage, setRejectedPage] = useState(0)

  const debouncedKeyword = useDebouncedValue(keywordInput, SEARCH_DEBOUNCE_MS)

  // 조건이 바뀌면 늘 첫 페이지부터 다시 본다.
  useEffect(() => {
    setApprovedPage(0)
  }, [sort, debouncedKeyword])

  const { data: approvedData, isLoading: isApprovedLoading, isFetching: isApprovedFetching } =
    useMyReviews({
      page: approvedPage,
      category,
      keyword: debouncedKeyword,
      sort,
      lang: isEn ? 'en' : 'ko',
    })
  const { data: pendingData, isLoading: isPendingLoading, isFetching: isPendingFetching } =
    useMyReviewRequests(pendingPage, 'PENDING', category)
  const { data: rejectedData, isLoading: isRejectedLoading, isFetching: isRejectedFetching } =
    useMyReviewRequests(rejectedPage, 'REJECTED', category)
  const { data: approvedCounts } = useMyReviewCategoryCounts()
  const { data: pendingCounts } = useMyReviewRequestCategoryCounts('PENDING')
  const { data: rejectedCounts } = useMyReviewRequestCategoryCounts('REJECTED')
  const deleteReviewMutation = useDeleteMyReview()
  const deleteRequestMutation = useDeleteMyReviewRequest()

  const approvedReviews = approvedData?.content ?? []
  const { data: socialByReviewId } = useSourceSocialPublications(
    'REVIEW',
    approvedReviews.map((review) => review.id),
  )
  const pendingRequests = pendingData?.content ?? []
  const rejectedRequests = rejectedData?.content ?? []
  // 상태 탭의 배지는 카테고리 필터와 무관한 전체 건수를 보여준다.
  const approvedCount = approvedCounts?.total ?? 0
  const pendingCount = pendingCounts?.total ?? 0
  const rejectedCount = rejectedCounts?.total ?? 0

  const isActiveLoading =
    activeTab === 'approved' ? isApprovedLoading
      : activeTab === 'pending' ? isPendingLoading
      : isRejectedLoading
  const isActiveFetching =
    activeTab === 'approved' ? isApprovedFetching
      : activeTab === 'pending' ? isPendingFetching
      : isRejectedFetching
  const activeCounts =
    activeTab === 'approved' ? approvedCounts
      : activeTab === 'pending' ? pendingCounts
      : rejectedCounts
  const isFiltered = category !== null || debouncedKeyword.trim().length > 0

  // 상태 탭이 바뀌면 카테고리 필터도 초기화한다 (탭마다 보유 카테고리가 다르기 때문).
  const handleTabChange = (tab: ReviewTab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setCategory(null)
  }

  const handleCategoryChange = (next: SpiritCategory | null) => {
    setCategory(next)
    setApprovedPage(0)
    setPendingPage(0)
    setRejectedPage(0)
  }

  const handleDelete = async (review: ReviewItem) => {
    const { title } = reviewSpiritLabel(review, isEn)
    if (!confirm(`"${title}" 리뷰를 삭제하시겠습니까?\n\n${t('social.deleteSourceWarning')}`)) return
    await deleteReviewMutation.mutateAsync({ spiritId: review.spiritId, reviewId: review.id })
  }

  const handlePendingDelete = async (request: VariantReviewRequestItem) => {
    if (!confirm(t('mypage.reviews.pendingDeleteConfirm'))) return
    await deleteRequestMutation.mutateAsync(request.id)
  }

  const tabClass = (tab: ReviewTab) =>
    [
      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
      activeTab === tab
        ? 'bg-primary-800 text-white shadow-sm'
        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
    ].join(' ')

  const listClass = `space-y-3 transition-opacity ${isActiveFetching ? 'opacity-60' : 'opacity-100'}`

  const emptyState = (title: string, description: string) => (
    <EmptyState
      title={isFiltered ? t('review.noFilterResult') : title}
      description={isFiltered
        ? (debouncedKeyword.trim() ? t('review.noFilterResultDesc') : t('mypage.reviews.noCategoryResultDesc'))
        : description}
      className="border border-neutral-200 rounded-2xl bg-white"
    />
  )

  return (
    <div className="space-y-4">
      {/* 상태 탭 */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => handleTabChange('approved')} className={tabClass('approved')}>
          {t('mypage.reviews.approvedTab')}
          <span className={activeTab === 'approved' ? 'text-primary-100' : 'text-neutral-400'}>
            {approvedCount}
          </span>
        </button>
        <button type="button" onClick={() => handleTabChange('pending')} className={tabClass('pending')}>
          {t('mypage.reviews.pendingTab')}
          <span className={activeTab === 'pending' ? 'text-primary-100' : 'text-neutral-400'}>
            {pendingCount}
          </span>
        </button>
        <button type="button" onClick={() => handleTabChange('rejected')} className={tabClass('rejected')}>
          {t('mypage.reviews.rejectedTab')}
          <span className={activeTab === 'rejected' ? 'text-primary-100' : 'text-neutral-400'}>
            {rejectedCount}
          </span>
        </button>
      </div>

      {/* 주류 카테고리 필터 */}
      <ReviewCategoryTabs
        value={category}
        onChange={handleCategoryChange}
        counts={activeCounts}
        className="border-b border-neutral-200 pb-3"
      />

      {activeTab === 'approved' && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as MyReviewSort)}
            aria-label={t('mypage.reviews.sortLabel')}
            className="text-sm border border-neutral-300 rounded-lg px-3 py-1.5 bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-700"
          >
            {SORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`mypage.reviews.sort.${value}`)}
              </option>
            ))}
          </select>

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
      )}

      {isActiveLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary-800" />
        </div>
      ) : activeTab === 'approved' ? (
        approvedReviews.length === 0 ? (
          emptyState(t('mypage.reviews.empty'), t('mypage.reviews.emptyDesc'))
        ) : (
          <>
            <div className={listClass}>
              {approvedReviews.map((review) => {
                const { title, editionValue } = reviewSpiritLabel(review, isEn)
                const secondaryName = isEn ? review.spiritNameKo : review.spiritNameEn
                return (
                  <article
                    key={review.id}
                    className="p-4 bg-white rounded-xl border border-neutral-100 space-y-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="min-w-0 sm:flex-1">
                        <Link
                          to={getSpiritDetailPath({
                            id: review.spiritId,
                            spiritCanonicalPathKo: review.spiritCanonicalPathKo,
                            spiritCanonicalPathEn: review.spiritCanonicalPathEn,
                          }, i18n.language)}
                          className="text-sm font-semibold text-neutral-900 hover:text-primary-800 transition-colors line-clamp-1 block"
                        >
                          {title}
                        </Link>
                        {editionValue && <EditionValue value={editionValue} />}
                        {secondaryName && (
                          <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{secondaryName}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-3 sm:flex-shrink-0">
                        <ReviewSocialLinks publications={socialByReviewId?.[String(review.id)]} />
                        <ReviewImageStrip images={review.images} compact />
                        <span
                          className="text-xl font-bold tabular-nums"
                          style={{ color: optionalScoreColor(review.totalScore) }}
                        >
                          {formatScore(review.totalScore)}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(myReviewEditPath(review.id))}
                            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(review)}
                            disabled={deleteReviewMutation.isPending}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <ScoreBar label="향" value={review.noseScore} />
                      <ScoreBar label="맛" value={review.tasteScore} />
                      <ScoreBar label="피니시" value={review.finishScore} />
                    </div>

                    {reviewCommentToText(review.comment) && (
                      <p className="text-xs text-neutral-600 line-clamp-2 border-t border-neutral-50 pt-2 leading-relaxed">
                        {reviewCommentToText(review.comment)}
                      </p>
                    )}

                    <p className="text-xs text-neutral-400">{formatDate(review.createdAt)}</p>
                  </article>
                )
              })}
            </div>

            <Pagination
              currentPage={approvedPage}
              totalPages={approvedData?.totalPages ?? 0}
              onPageChange={setApprovedPage}
              className="mt-4"
            />
          </>
        )
      ) : activeTab === 'pending' ? (
        pendingRequests.length === 0 ? (
          emptyState(t('mypage.reviews.pendingEmpty'), t('mypage.reviews.pendingDesc'))
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-900">
                {t('mypage.reviews.pendingTitle')}
              </h2>
              <div className={listClass}>
                {pendingRequests.map((request) => {
                  const { title, editionValue } = variantRequestSpiritLabel(request, isEn)
                  const secondaryName = isEn ? request.masterNameKo : request.masterNameEn
                  return (
                    <article
                      key={`pending-${request.id}`}
                      className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <Link
                            to={getSpiritDetailPath({
                              id: request.masterSpiritId,
                              spiritCanonicalPathKo: request.masterCanonicalPathKo,
                              spiritCanonicalPathEn: request.masterCanonicalPathEn,
                            }, i18n.language)}
                            className="block text-sm font-semibold text-neutral-900 transition-colors hover:text-primary-800"
                          >
                            {title}
                          </Link>
                          {editionValue && <EditionValue value={editionValue} />}
                          {secondaryName && (
                            <p className="mt-0.5 text-xs text-neutral-500">{secondaryName}</p>
                          )}
                          <p className="mt-2 text-xs text-amber-800">
                            {request.abv}% / {request.volumeMl}ml
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-amber-800">
                            {t('mypage.reviews.pendingDesc')}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                          <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">
                            {t('mypage.reviews.pendingBadge')}
                          </span>
                          <span
                            className="text-xl font-bold tabular-nums"
                            style={{ color: optionalScoreColor(request.totalScore) }}
                          >
                            {formatScore(request.totalScore)}
                          </span>
                        </div>
                      </div>

                      <ReviewImageStrip images={request.images} compact className="mt-3" />

                      <div className="mt-3 space-y-1.5 rounded-lg bg-white/70 p-3">
                        <ScoreBar label="향" value={request.noseScore} />
                        <ScoreBar label="맛" value={request.tasteScore} />
                        <ScoreBar label="피니시" value={request.finishScore} />
                      </div>

                      {reviewCommentToText(request.comment) && (
                        <p className="mt-3 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                          {reviewCommentToText(request.comment)}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-neutral-500">
                          {t('mypage.reviews.pendingCreatedAt')} {formatDate(request.createdAt)}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(myReviewRequestEditPath(request.id))}
                            className="rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-50"
                          >
                            {t('mypage.reviews.pendingEdit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePendingDelete(request)}
                            disabled={deleteRequestMutation.isPending}
                            className="rounded-md border border-red-100 bg-white px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                          >
                            {t('mypage.reviews.pendingDelete')}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <Pagination
              currentPage={pendingPage}
              totalPages={pendingData?.totalPages ?? 0}
              onPageChange={setPendingPage}
              className="mt-4"
            />
          </>
        )
      ) : rejectedRequests.length === 0 ? (
        emptyState(t('mypage.reviews.rejectedEmpty'), t('mypage.reviews.rejectedDesc'))
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-neutral-900">
              {t('mypage.reviews.rejectedTitle')}
            </h2>
            <div className={listClass}>
              {rejectedRequests.map((request) => {
                const canResubmit = !!request.linkedVariantId && !request.reviewId
                const { title, editionValue } = variantRequestSpiritLabel(request, isEn)
                const secondaryName = isEn ? request.masterNameKo : request.masterNameEn
                return (
                  <article
                    key={`rejected-${request.id}`}
                    className="rounded-xl border border-red-100 bg-red-50/60 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          to={getSpiritDetailPath({
                            id: request.masterSpiritId,
                            spiritCanonicalPathKo: request.masterCanonicalPathKo,
                            spiritCanonicalPathEn: request.masterCanonicalPathEn,
                          }, i18n.language)}
                          className="block text-sm font-semibold text-neutral-900 transition-colors hover:text-primary-800"
                        >
                          {title}
                        </Link>
                        {editionValue && <EditionValue value={editionValue} />}
                        {secondaryName && (
                          <p className="mt-0.5 text-xs text-neutral-500">{secondaryName}</p>
                        )}
                        <p className="mt-2 text-xs text-red-800">
                          {request.abv}% / {request.volumeMl}ml
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-red-800">
                          {canResubmit ? t('mypage.reviews.rejectedDesc') : t('mypage.reviews.rejectedLegacyDesc')}
                        </p>
                        {request.rejectReason && (
                          <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs leading-relaxed text-red-700">
                            {t('mypage.reviews.rejectReason')} {request.rejectReason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          {t('mypage.reviews.rejectedBadge')}
                        </span>
                        <span
                          className="text-xl font-bold tabular-nums"
                          style={{ color: optionalScoreColor(request.totalScore) }}
                        >
                          {formatScore(request.totalScore)}
                        </span>
                      </div>
                    </div>

                    <ReviewImageStrip images={request.images} compact className="mt-3" />

                    <div className="mt-3 space-y-1.5 rounded-lg bg-white/80 p-3">
                      <ScoreBar label="향" value={request.noseScore} />
                      <ScoreBar label="맛" value={request.tasteScore} />
                      <ScoreBar label="피니시" value={request.finishScore} />
                    </div>

                    {reviewCommentToText(request.comment) && (
                      <p className="mt-3 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                        {reviewCommentToText(request.comment)}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-neutral-500">
                        {t('mypage.reviews.reviewedAt')} {formatDate(request.reviewedAt ?? request.createdAt)}
                      </p>
                      {canResubmit && (
                        <button
                          type="button"
                          onClick={() => navigate(myReviewRequestEditPath(request.id))}
                          className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                        >
                          {t('mypage.reviews.rejectedResubmit')}
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <Pagination
            currentPage={rejectedPage}
            totalPages={rejectedData?.totalPages ?? 0}
            onPageChange={setRejectedPage}
            className="mt-4"
          />
        </>
      )}
    </div>
  )
}
