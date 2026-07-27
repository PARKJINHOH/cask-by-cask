import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import ReviewFormModal from './ReviewFormModal'
import PendingVariantReviewEditModal from './PendingVariantReviewEditModal'
import {
  useDeleteMyReview,
  useDeleteMyReviewRequest,
  useMyReviewRequests,
  useMyReviews,
  useResubmitMyReviewRequest,
  useUpdateMyReviewRequest,
} from '../hooks/useReviews'
import { scoreColor, formatDate } from '@/shared/utils/format'
import type {
  CreateVariantReviewRequest,
  ReviewImagePlanItem,
  ReviewItem,
  VariantReviewRequestItem,
} from '../types/review.types'
import { getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
import ReviewImageStrip from './ReviewImageStrip'

type ReviewTab = 'approved' | 'pending' | 'rejected'
type RequestEditMode = 'pending' | 'resubmitReview'

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

function variantRequestLabel(item: VariantReviewRequestItem) {
  return [item.seriesIdentifier, item.variantValue].filter(Boolean).join(' ') || item.variantValue
}

export default function MyReviewList() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<ReviewTab>('approved')
  const [approvedPage, setApprovedPage] = useState(0)
  const [pendingPage, setPendingPage] = useState(0)
  const [rejectedPage, setRejectedPage] = useState(0)
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null)
  const [editingRequest, setEditingRequest] = useState<VariantReviewRequestItem | null>(null)
  const [editingRequestMode, setEditingRequestMode] = useState<RequestEditMode>('pending')

  const { data: approvedData, isLoading: isApprovedLoading } = useMyReviews(approvedPage)
  const { data: pendingData, isLoading: isPendingLoading } = useMyReviewRequests(pendingPage, 'PENDING')
  const { data: rejectedData, isLoading: isRejectedLoading } = useMyReviewRequests(rejectedPage, 'REJECTED')
  const deleteReviewMutation = useDeleteMyReview()
  const updateRequestMutation = useUpdateMyReviewRequest()
  const resubmitRequestMutation = useResubmitMyReviewRequest()
  const deleteRequestMutation = useDeleteMyReviewRequest()

  const approvedReviews = approvedData?.content ?? []
  const pendingRequests = pendingData?.content ?? []
  const rejectedRequests = rejectedData?.content ?? []
  const approvedCount = approvedData?.totalElements ?? 0
  const pendingCount = pendingData?.totalElements ?? 0
  const rejectedCount = rejectedData?.totalElements ?? 0
  const isActiveLoading =
    activeTab === 'approved'
      ? isApprovedLoading
      : activeTab === 'pending'
      ? isPendingLoading
      : isRejectedLoading

  const handleDelete = async (review: ReviewItem) => {
    if (!confirm(`"${review.spiritNameKo}" 리뷰를 삭제하시겠습니까?\n\n${t('social.deleteSourceWarning')}`)) return
    await deleteReviewMutation.mutateAsync({ spiritId: review.spiritId, reviewId: review.id })
  }

  const handlePendingDelete = async (request: VariantReviewRequestItem) => {
    if (!confirm(t('mypage.reviews.pendingDeleteConfirm'))) return
    await deleteRequestMutation.mutateAsync(request.id)
  }

  const handlePendingUpdate = async (
    data: CreateVariantReviewRequest,
    media: { imagePlan: ReviewImagePlanItem[]; images: File[] },
  ) => {
    if (!editingRequest) return
    await updateRequestMutation.mutateAsync({ requestId: editingRequest.id, data, ...media })
    setEditingRequest(null)
  }

  const handleRejectedResubmit = async (
    data: CreateVariantReviewRequest,
    media: { imagePlan: ReviewImagePlanItem[]; images: File[] },
  ) => {
    if (!editingRequest) return
    await resubmitRequestMutation.mutateAsync({ requestId: editingRequest.id, data, ...media })
    setEditingRequest(null)
    setPendingPage(0)
    setActiveTab('pending')
  }

  const tabClass = (tab: ReviewTab) =>
    [
      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
      activeTab === tab
        ? 'bg-primary-800 text-white shadow-sm'
        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
    ].join(' ')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={tabClass('approved')}
        >
          {t('mypage.reviews.approvedTab')}
          <span className={activeTab === 'approved' ? 'text-primary-100' : 'text-neutral-400'}>
            {approvedCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={tabClass('pending')}
        >
          {t('mypage.reviews.pendingTab')}
          <span className={activeTab === 'pending' ? 'text-primary-100' : 'text-neutral-400'}>
            {pendingCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={tabClass('rejected')}
        >
          {t('mypage.reviews.rejectedTab')}
          <span className={activeTab === 'rejected' ? 'text-primary-100' : 'text-neutral-400'}>
            {rejectedCount}
          </span>
        </button>
      </div>

      {isActiveLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary-800" />
        </div>
      ) : activeTab === 'approved' ? (
        approvedReviews.length === 0 ? (
          <EmptyState
            title={t('mypage.reviews.empty')}
            description={t('mypage.reviews.emptyDesc')}
            className="border border-neutral-200 rounded-2xl bg-white"
          />
        ) : (
          <>
            <div className="space-y-3">
              {approvedReviews.map((review) => (
                <article
                  key={review.id}
                  className="p-4 bg-white rounded-xl border border-neutral-100 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={getSpiritDetailPath({
                          id: review.spiritId,
                          spiritCanonicalPathKo: review.spiritCanonicalPathKo,
                          spiritCanonicalPathEn: review.spiritCanonicalPathEn,
                        }, i18n.language)}
                        className="text-sm font-semibold text-neutral-900 hover:text-primary-800 transition-colors line-clamp-1 block"
                      >
                        {review.spiritNameKo}
                      </Link>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                        {review.spiritNameEn}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ReviewImageStrip images={review.images} compact />
                      <span
                        className="text-xl font-bold tabular-nums"
                        style={{ color: scoreColor(review.totalScore) }}
                      >
                        {review.totalScore.toFixed(1)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingReview(review)}
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

                  {review.comment && (
                    <p className="text-xs text-neutral-600 line-clamp-2 border-t border-neutral-50 pt-2 leading-relaxed">
                      {review.comment}
                    </p>
                  )}

                  <p className="text-xs text-neutral-400">{formatDate(review.createdAt)}</p>
                </article>
              ))}
            </div>

            {approvedData && approvedData.totalPages > 1 && (
              <Pagination
                currentPage={approvedPage}
                totalPages={approvedData.totalPages}
                onPageChange={setApprovedPage}
                className="mt-4"
              />
            )}
          </>
        )
      ) : activeTab === 'pending' ? (
        pendingRequests.length === 0 ? (
        <EmptyState
          title={t('mypage.reviews.pendingEmpty')}
          description={t('mypage.reviews.pendingDesc')}
          className="border border-neutral-200 rounded-2xl bg-white"
        />
        ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">
                {t('mypage.reviews.pendingTitle')}
              </h2>
            </div>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
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
                        {i18n.language === 'en'
                          ? request.masterNameEn || request.masterNameKo
                          : request.masterNameKo}
                      </Link>
                      {request.masterNameEn && (
                        <p className="mt-0.5 text-xs text-neutral-500">{request.masterNameEn}</p>
                      )}
                      <p className="mt-2 text-sm font-medium text-amber-900">
                        {variantRequestLabel(request)}
                      </p>
                      <p className="mt-1 text-xs text-amber-800">
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
                        style={{ color: scoreColor(request.totalScore) }}
                      >
                        {request.totalScore.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <ReviewImageStrip images={request.images} compact className="mt-3" />

                  <div className="mt-3 space-y-1.5 rounded-lg bg-white/70 p-3">
                    <ScoreBar label="향" value={request.noseScore} />
                    <ScoreBar label="맛" value={request.tasteScore} />
                    <ScoreBar label="피니시" value={request.finishScore} />
                  </div>

                  {request.comment && (
                    <p className="mt-3 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {request.comment}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-neutral-500">
                      {t('mypage.reviews.pendingCreatedAt')} {formatDate(request.createdAt)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRequestMode('pending')
                          setEditingRequest(request)
                        }}
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
              ))}
            </div>
          </section>

          {pendingData && pendingData.totalPages > 1 && (
            <Pagination
              currentPage={pendingPage}
              totalPages={pendingData.totalPages}
              onPageChange={setPendingPage}
              className="mt-4"
            />
          )}
        </>
        )
      ) : rejectedRequests.length === 0 ? (
        <EmptyState
          title={t('mypage.reviews.rejectedEmpty')}
          description={t('mypage.reviews.rejectedDesc')}
          className="border border-neutral-200 rounded-2xl bg-white"
        />
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">
                {t('mypage.reviews.rejectedTitle')}
              </h2>
            </div>
            <div className="space-y-2">
              {rejectedRequests.map((request) => {
                const canResubmit = !!request.linkedVariantId && !request.reviewId
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
                          {i18n.language === 'en'
                            ? request.masterNameEn || request.masterNameKo
                            : request.masterNameKo}
                        </Link>
                        {request.masterNameEn && (
                          <p className="mt-0.5 text-xs text-neutral-500">{request.masterNameEn}</p>
                        )}
                        <p className="mt-2 text-sm font-medium text-red-900">
                          {variantRequestLabel(request)}
                        </p>
                        <p className="mt-1 text-xs text-red-800">
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
                          style={{ color: scoreColor(request.totalScore) }}
                        >
                          {request.totalScore.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <ReviewImageStrip images={request.images} compact className="mt-3" />

                    <div className="mt-3 space-y-1.5 rounded-lg bg-white/80 p-3">
                      <ScoreBar label="향" value={request.noseScore} />
                      <ScoreBar label="맛" value={request.tasteScore} />
                      <ScoreBar label="피니시" value={request.finishScore} />
                    </div>

                    {request.comment && (
                      <p className="mt-3 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                        {request.comment}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-neutral-500">
                        {t('mypage.reviews.reviewedAt')} {formatDate(request.reviewedAt ?? request.createdAt)}
                      </p>
                      {canResubmit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRequestMode('resubmitReview')
                            setEditingRequest(request)
                          }}
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

          {rejectedData && rejectedData.totalPages > 1 && (
            <Pagination
              currentPage={rejectedPage}
              totalPages={rejectedData.totalPages}
              onPageChange={setRejectedPage}
              className="mt-4"
            />
          )}
        </>
      )}

      {editingReview && (
        <ReviewFormModal
          open
          onClose={() => setEditingReview(null)}
          onSuccess={() => setApprovedPage(0)}
          spiritId={editingReview.spiritId}
          editingReview={editingReview}
        />
      )}

      {editingRequest && (
        <PendingVariantReviewEditModal
          open
          request={editingRequest}
          mode={editingRequestMode}
          isLoading={
            editingRequestMode === 'resubmitReview'
              ? resubmitRequestMutation.isPending
              : updateRequestMutation.isPending
          }
          onClose={() => setEditingRequest(null)}
          onSubmit={editingRequestMode === 'resubmitReview' ? handleRejectedResubmit : handlePendingUpdate}
        />
      )}
    </div>
  )
}
