import { FormEvent, useState } from 'react'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import Pagination from '@/shared/components/Pagination'
import Spinner from '@/shared/components/Spinner'
import { formatDate, formatScore, optionalScoreColor, NO_SCORE_TEXT } from '@/shared/utils/format'
import {
  useAdminReviews,
  useDeleteAdminReview,
  useHideAdminReview,
  useUnhideAdminReview,
} from '../hooks/useAdminContent'
import type { AdminReview, AdminVariantReviewRequest, ModerationPayload } from '../types/admin.types'
import ReviewCommentContent from '@/domain/review/components/ReviewCommentContent'
import { RequiredMark } from '@/shared/components/FormFieldLabel'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

type ModerationAction = 'hide' | 'delete'

interface ModerationState {
  action: ModerationAction
  review: AdminReview
}

function ScoreLine({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 text-neutral-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${value ?? 0}%`, backgroundColor: optionalScoreColor(value) }}
        />
      </div>
      <span className="w-9 text-right font-semibold tabular-nums" style={{ color: optionalScoreColor(value) }}>
        {value == null ? NO_SCORE_TEXT : value.toFixed(0)}
      </span>
    </div>
  )
}

function ModerationModal({
  state,
  isLoading,
  onClose,
  onSubmit,
}: {
  state: ModerationState | null
  isLoading: boolean
  onClose: () => void
  onSubmit: (payload: ModerationPayload) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [sendEmail, setSendEmail] = useState(true)

  if (!state) return null

  const title = state.action === 'hide' ? '리뷰 숨김 처리' : '리뷰 삭제 처리'
  const submitLabel = state.action === 'hide' ? '숨김 처리' : '삭제'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await onSubmit({ reason: reason.trim() || null, sendEmail })
    setReason('')
    setSendEmail(true)
  }

  return (
    <Modal open={!!state} onClose={onClose} title={title} size="md" closeOnOverlay={!isLoading}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-neutral-600">
          사용자가 작성한 리뷰를 운영 정책에 따라 처리합니다. 이메일 발송을 체크하면 사유가 함께 안내됩니다.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            사유
          </label>
          <AutoGrowTextarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="예) 악의적인 점수 부여 또는 운영 정책 위반"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(event) => setSendEmail(event.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-primary-800 focus:ring-primary-500"
          />
          이메일 발송
        </label>
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            type="submit"
            variant={state.action === 'delete' ? 'danger' : 'primary'}
            size="sm"
            isLoading={isLoading}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

interface AdminSpiritReviewPanelProps {
  spiritId: number
  pendingVariantReview?: AdminVariantReviewRequest | null
  reviewApprovalChecked?: boolean
  reviewRejectedChecked?: boolean
  reviewRejectReason?: string
  onReviewApprovalCheckedChange?: (checked: boolean) => void
  onReviewRejectedCheckedChange?: (checked: boolean) => void
  onReviewRejectReasonChange?: (reason: string) => void
}

export default function AdminSpiritReviewPanel({
  spiritId,
  pendingVariantReview,
  reviewApprovalChecked = false,
  reviewRejectedChecked = false,
  reviewRejectReason = '',
  onReviewApprovalCheckedChange,
  onReviewRejectedCheckedChange,
  onReviewRejectReasonChange,
}: AdminSpiritReviewPanelProps) {
  const [page, setPage] = useState(0)
  const [moderation, setModeration] = useState<ModerationState | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const { data, isLoading } = useAdminReviews({ spiritId, page })
  const hideReview = useHideAdminReview()
  const unhideReview = useUnhideAdminReview()
  const deleteReview = useDeleteAdminReview()

  const handleModerationSubmit = async (payload: ModerationPayload) => {
    if (!moderation) return
    setActionError(null)
    try {
      if (moderation.action === 'hide') {
        await hideReview.mutateAsync({ id: moderation.review.id, data: payload })
      } else {
        await deleteReview.mutateAsync({ id: moderation.review.id, data: payload })
      }
      setModeration(null)
    } catch {
      setActionError('리뷰 처리 중 오류가 발생했습니다.')
    }
  }

  const handleUnhide = async (review: AdminReview) => {
    setActionError(null)
    try {
      await unhideReview.mutateAsync(review.id)
    } catch {
      setActionError('리뷰 숨김 해제 중 오류가 발생했습니다.')
    }
  }

  const isActionLoading =
    hideReview.isPending || unhideReview.isPending || deleteReview.isPending

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-xl bg-white py-16 shadow-sm">
        <Spinner size="lg" className="text-primary-800" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">리뷰 관리</h2>
            <p className="mt-1 text-sm text-neutral-500">
              이 주류와 하위 에디션에 작성된 리뷰를 확인하고 악의적 리뷰를 숨김 처리할 수 있습니다.
            </p>
          </div>
          <Badge variant="neutral" size="sm">
            {(data?.totalElements ?? 0) + (pendingVariantReview ? 1 : 0)}개
          </Badge>
        </div>
      </div>

      {pendingVariantReview && (
        <article className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex shrink-0 flex-col gap-2 lg:w-44">
              <label className="flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900">
                <input
                  type="checkbox"
                  checked={reviewApprovalChecked}
                  onChange={(event) => {
                    onReviewApprovalCheckedChange?.(event.target.checked)
                    if (event.target.checked) onReviewRejectedCheckedChange?.(false)
                  }}
                  className="h-4 w-4 rounded border-amber-300 text-primary-800 focus:ring-primary-500"
                />
                리뷰 검수 완료
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700">
                <input
                  type="checkbox"
                  checked={reviewRejectedChecked}
                  onChange={(event) => {
                    onReviewRejectedCheckedChange?.(event.target.checked)
                    if (event.target.checked) onReviewApprovalCheckedChange?.(false)
                  }}
                  className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-400"
                />
                리뷰 미승인
              </label>
              {reviewRejectedChecked && (
                <div className="rounded-lg border border-red-200 bg-white p-3">
                  <label className="mb-1.5 block text-xs font-semibold text-red-700">
                    미승인 사유 <RequiredMark />
                  </label>
                  <AutoGrowTextarea
                    required
                    aria-required="true"
                    value={reviewRejectReason}
                    onChange={(event) => onReviewRejectReasonChange?.(event.target.value)}
                    rows={5}
                    maxLength={500}
                    placeholder="예) 향/맛/피니시 설명이 부족하거나 악의적 점수로 판단됩니다."
                    className="w-full rounded-lg border border-red-100 px-3 py-2 text-xs leading-relaxed text-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <p className="mt-1 text-[11px] text-red-500">
                    사용자 마이페이지에 그대로 표시됩니다.
                  </p>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="PENDING" size="sm">미승인 리뷰</Badge>
                <span className="font-semibold text-neutral-900">{pendingVariantReview.requesterNickname}</span>
                <span className="text-xs text-neutral-500">
                  {pendingVariantReview.masterNameKo} · {[pendingVariantReview.seriesIdentifier, pendingVariantReview.variantValue].filter(Boolean).join(' ')}
                </span>
              </div>
              <p className="mt-2 text-xs text-amber-800">
                리뷰 내용을 확인한 뒤 왼쪽 체크박스를 선택해야 저장할 수 있습니다. 리뷰 미승인 선택 시 에디션만 등록되고 리뷰는 사용자 재승인 요청 대상이 됩니다.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {pendingVariantReview.noseNote && (
                  <p className="rounded-lg border border-white bg-white p-2 text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-800">향</span> {pendingVariantReview.noseNote}
                  </p>
                )}
                {pendingVariantReview.tasteNote && (
                  <p className="rounded-lg border border-white bg-white p-2 text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-800">맛</span> {pendingVariantReview.tasteNote}
                  </p>
                )}
                {pendingVariantReview.finishNote && (
                  <p className="rounded-lg border border-white bg-white p-2 text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-800">피니시</span> {pendingVariantReview.finishNote}
                  </p>
                )}
              </div>
              {pendingVariantReview.comment && (
                <div className="mt-2 rounded-lg border border-white bg-white p-2 text-xs leading-relaxed text-neutral-600">
                  <span className="font-semibold text-neutral-800">종합평가</span>
                  <ReviewCommentContent
                    value={pendingVariantReview.comment}
                    className="mt-1 text-xs leading-relaxed text-neutral-600"
                  />
                </div>
              )}
            </div>
            <div className="w-full rounded-xl border border-amber-100 bg-white p-3 lg:w-56">
              <div className="space-y-1.5">
                <ScoreLine label="향" value={pendingVariantReview.noseScore} />
                <ScoreLine label="맛" value={pendingVariantReview.tasteScore} />
                <ScoreLine label="피니시" value={pendingVariantReview.finishScore} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                <span className="text-xs font-semibold text-neutral-500">총점</span>
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: optionalScoreColor(pendingVariantReview.totalScore) }}
                >
                  {formatScore(pendingVariantReview.totalScore)}
                </span>
              </div>
            </div>
          </div>
        </article>
      )}

      {actionError && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {!data || (data.empty && !pendingVariantReview) ? (
        <div className="rounded-xl bg-white p-10 text-center text-sm text-neutral-400 shadow-sm">
          등록된 리뷰가 없습니다.
        </div>
      ) : data.empty ? null : (
        <div className="space-y-3">
          {data.content.map((review) => (
            <article key={review.id} className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-neutral-900">{review.userNickname}</span>
                    <Badge variant={review.isHidden ? 'HIDDEN' : 'ACTIVE'} size="sm">
                      {review.isHidden ? '숨김' : '노출'}
                    </Badge>
                    {review.reportCount > 0 && (
                      <Badge variant="warning" size="sm">
                        신고 {review.reportCount}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    {review.spiritNameKo} · {formatDate(review.createdAt)}
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {review.noseNote && (
                      <p className="rounded-lg border border-neutral-100 bg-white p-2 text-xs text-neutral-600">
                        <span className="font-semibold text-neutral-800">향</span> {review.noseNote}
                      </p>
                    )}
                    {review.tasteNote && (
                      <p className="rounded-lg border border-neutral-100 bg-white p-2 text-xs text-neutral-600">
                        <span className="font-semibold text-neutral-800">맛</span> {review.tasteNote}
                      </p>
                    )}
                    {review.finishNote && (
                      <p className="rounded-lg border border-neutral-100 bg-white p-2 text-xs text-neutral-600">
                        <span className="font-semibold text-neutral-800">피니시</span> {review.finishNote}
                      </p>
                    )}
                  </div>
                  {review.comment && (
                    <div className="mt-2 rounded-lg border border-neutral-100 bg-white p-2 text-xs leading-relaxed text-neutral-600">
                      <span className="font-semibold text-neutral-800">종합평가</span>
                      <ReviewCommentContent
                        value={review.comment}
                        className="mt-1 text-xs leading-relaxed text-neutral-600"
                      />
                    </div>
                  )}
                </div>
                <div className="w-full space-y-3 lg:w-56">
                  <div className="rounded-xl border border-neutral-100 p-3">
                    <div className="space-y-1.5">
                      <ScoreLine label="향" value={review.noseScore} />
                      <ScoreLine label="맛" value={review.tasteScore} />
                      <ScoreLine label="피니시" value={review.finishScore} />
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span className="text-xs font-semibold text-neutral-500">총점</span>
                      <span
                        className="text-lg font-bold tabular-nums"
                        style={{ color: optionalScoreColor(review.totalScore) }}
                      >
                        {formatScore(review.totalScore)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    {review.isHidden ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUnhide(review)}
                        isLoading={unhideReview.isPending}
                      >
                        숨김 해제
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setModeration({ action: 'hide', review })}
                      >
                        숨김
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setModeration({ action: 'delete', review })}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
      )}

      <ModerationModal
        state={moderation}
        isLoading={isActionLoading}
        onClose={() => setModeration(null)}
        onSubmit={handleModerationSubmit}
      />
    </section>
  )
}
