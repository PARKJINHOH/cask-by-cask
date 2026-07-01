import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Badge, { type BadgeVariant } from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import Modal from '@/shared/components/Modal'
import Pagination from '@/shared/components/Pagination'
import Spinner from '@/shared/components/Spinner'
import { formatDate, scoreColor } from '@/shared/utils/format'
import {
  useAdminVariantRequests,
  useAdminVariantReviewRequests,
  useApproveVariantRequest,
  useRejectVariantRequest,
  useRejectVariantReviewRequest,
} from '@/domain/admin/hooks/useAdminSpirits'
import type {
  AdminVariantRequest,
  AdminVariantReviewRequest,
  ModerationPayload,
  VariantReviewRequestStatus,
} from '@/domain/admin/types/admin.types'
import type { SpiritCategory, SpiritStatus } from '@/domain/spirit/types/spirit.types'

const CATEGORY_LABEL: Record<SpiritCategory, string> = {
  WHISKY: '위스키',
  COGNAC: '꼬냑',
  WINE: '와인',
  OTHER: '기타',
}

const VARIANT_TYPE_LABEL: Record<string, string> = {
  BATCH: '배치',
  RELEASE_YEAR: '출시 연도',
  SINGLE_CASK: '싱글 캐스크',
  NONE: '없음',
}

const REQUEST_STATUS_LABEL: Record<VariantReviewRequestStatus, string> = {
  PENDING: '승인 대기',
  APPROVED: '승인',
  REJECTED: '반려',
  MERGED: '기존 에디션 연결',
}

const LEGACY_STATUS_LABEL: Record<SpiritStatus, string> = {
  ACTIVE: '승인',
  HIDDEN: '반려/숨김',
  PENDING: '대기',
}

type StatusFilter = VariantReviewRequestStatus | 'ALL'

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'PENDING', label: '대기' },
  { value: 'APPROVED', label: '승인' },
  { value: 'MERGED', label: '연결' },
  { value: 'REJECTED', label: '반려' },
  { value: 'ALL', label: '전체' },
]

function editionLabel(item: {
  seriesIdentifier?: string | null
  variantValue?: string | null
}) {
  return [item.seriesIdentifier, item.variantValue].filter(Boolean).join(' ') || item.variantValue || '-'
}

function statusBadgeVariant(status: VariantReviewRequestStatus): BadgeVariant {
  if (status === 'APPROVED' || status === 'MERGED') return 'APPROVED'
  if (status === 'REJECTED') return 'REJECTED'
  return 'PENDING'
}

function legacyStatusFromFilter(status: StatusFilter): SpiritStatus | undefined {
  if (status === 'PENDING') return 'PENDING'
  if (status === 'APPROVED' || status === 'MERGED') return 'ACTIVE'
  if (status === 'REJECTED') return 'HIDDEN'
  return undefined
}

function ReviewScoreSummary({ item }: { item: AdminVariantReviewRequest }) {
  return (
    <div className="space-y-1 text-xs text-neutral-500">
      <div className="flex items-center gap-2">
        <span className="w-10">향</span>
        <span className="tabular-nums">{item.noseScore.toFixed(0)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-10">맛</span>
        <span className="tabular-nums">{item.tasteScore.toFixed(0)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-10">피니시</span>
        <span className="tabular-nums">{item.finishScore.toFixed(0)}</span>
      </div>
    </div>
  )
}

function RejectModal({
  item,
  isLoading,
  onClose,
  onSubmit,
}: {
  item: AdminVariantReviewRequest | AdminVariantRequest | null
  isLoading: boolean
  onClose: () => void
  onSubmit: (payload: ModerationPayload) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [sendEmail, setSendEmail] = useState(true)

  useEffect(() => {
    if (item) {
      setReason('')
      setSendEmail(true)
    }
  }, [item])

  if (!item) return null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await onSubmit({ reason: reason.trim() || null, sendEmail })
  }

  return (
    <Modal open={!!item} onClose={onClose} title="하위 에디션/리뷰 반려" size="md" closeOnOverlay={!isLoading}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-neutral-600">
          반려 사유를 입력합니다. 이메일 발송을 체크하면 요청자에게 사유가 안내됩니다.
        </p>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          maxLength={500}
          placeholder="예) 동일 에디션이 이미 존재하거나 리뷰 내용이 기준에 맞지 않음"
          className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
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
          <Button type="submit" variant="danger" size="sm" isLoading={isLoading}>
            반려
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminVariantRequestPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const keywordParam = searchParams.get('keyword') ?? ''
  const status = (searchParams.get('status') ?? 'PENDING') as StatusFilter
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const [keyword, setKeyword] = useState(keywordParam)
  const [rejectTarget, setRejectTarget] = useState<AdminVariantReviewRequest | null>(null)
  const [legacyRejectTarget, setLegacyRejectTarget] = useState<AdminVariantRequest | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const detailState = { returnTo: `${location.pathname}${location.search}` }

  const { data: reviewRequests, isLoading: isReviewRequestLoading } = useAdminVariantReviewRequests({
    keyword: keywordParam.trim() || undefined,
    status,
    page,
  })
  const { data: legacyRequests, isLoading: isLegacyLoading } = useAdminVariantRequests({
    keyword: keywordParam.trim() || undefined,
    status: legacyStatusFromFilter(status),
    page,
  })
  const rejectReviewRequest = useRejectVariantReviewRequest()
  const approveLegacyRequest = useApproveVariantRequest()
  const rejectLegacyRequest = useRejectVariantRequest()

  const setParam = (key: string, value: string | null, nextPage = 0) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        next.set('page', String(nextPage))
        return next
      },
      { replace: true },
    )

  const setPage = (nextPage: number) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('page', String(nextPage))
        return next
      },
      { replace: true },
    )

  const goToVariantReviewApproval = (item: AdminVariantReviewRequest) => {
    navigate(`/admin/spirits/${item.masterId}`, {
      state: item.status === 'PENDING'
        ? { ...detailState, variantReviewApproval: item }
        : detailState,
    })
  }

  const handleReviewReject = async (payload: ModerationPayload) => {
    if (!rejectTarget) return
    setActionError(null)
    try {
      await rejectReviewRequest.mutateAsync({ id: rejectTarget.id, data: payload })
      setRejectTarget(null)
    } catch {
      setActionError('반려 처리 중 오류가 발생했습니다.')
    }
  }

  const handleLegacyApprove = async (id: number) => {
    setActionError(null)
    try {
      await approveLegacyRequest.mutateAsync(id)
    } catch {
      setActionError('리뷰 없는 기존 요청 승인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleLegacyReject = async (payload: ModerationPayload) => {
    if (!legacyRejectTarget) return
    setActionError(null)
    try {
      await rejectLegacyRequest.mutateAsync({ id: legacyRejectTarget.id, data: payload })
      setLegacyRejectTarget(null)
    } catch {
      setActionError('리뷰 없는 기존 요청 반려 처리 중 오류가 발생했습니다.')
    }
  }

  const isLoading = isReviewRequestLoading || isLegacyLoading
  const reviewItems = reviewRequests?.content ?? []
  const legacyItems = legacyRequests?.content ?? []

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">하위 에디션/리뷰 승인</h1>
        <p className="mt-1 text-sm text-neutral-500">
          사용자가 리뷰와 함께 제출한 하위 에디션 요청을 승인하거나 기존 에디션에 연결합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="min-w-[220px] flex-1">
          <Input
            label="검색"
            placeholder="주류명, 식별 값, 요청자"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setParam('keyword', event.target.value.trim() || null)
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">상태</label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setParam('status', value, 0)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  status === value
                    ? 'bg-primary-800 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actionError && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-800" />
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b border-neutral-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">리뷰 포함 신규 요청</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left font-medium text-neutral-500">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">주류</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">추가 에디션</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">규격/메모</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">리뷰</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">상태</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">요청자</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">요청일</th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-500">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {reviewItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-neutral-400">
                        요청이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    reviewItems.map((item) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer transition-colors hover:bg-neutral-50"
                        onClick={() => goToVariantReviewApproval(item)}
                      >
                        <td className="px-4 py-3 tabular-nums text-neutral-400">{item.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900">{item.masterNameKo}</p>
                          <p className="text-xs text-neutral-400">{item.masterNameEn}</p>
                          <Badge variant={item.category} size="sm" className="mt-1">
                            {CATEGORY_LABEL[item.category]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              goToVariantReviewApproval(item)
                            }}
                            className="text-left font-semibold text-primary-900 hover:underline"
                          >
                            {editionLabel(item)}
                          </button>
                          {item.variantValueEn && (
                            <p className="text-xs text-neutral-400">
                              {[item.seriesIdentifierEn, item.variantValueEn].filter(Boolean).join(' ')}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-neutral-500">
                            {VARIANT_TYPE_LABEL[item.variantType ?? 'NONE'] ?? item.variantType}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-neutral-600">{item.abv}% / {item.volumeMl}ml</p>
                          {item.requestMemo && (
                            <p className="mt-1 line-clamp-2 max-w-[220px] text-xs text-neutral-400">{item.requestMemo}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <span
                              className="text-lg font-bold tabular-nums"
                              style={{ color: scoreColor(item.totalScore) }}
                            >
                              {item.totalScore.toFixed(1)}
                            </span>
                            <ReviewScoreSummary item={item} />
                          </div>
                          {item.comment && (
                            <p className="mt-2 line-clamp-2 max-w-md text-xs text-neutral-500">{item.comment}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadgeVariant(item.status)} size="sm">
                            {REQUEST_STATUS_LABEL[item.status]}
                          </Badge>
                          {item.linkedVariantId && (
                            <p className="mt-1 text-xs text-neutral-400">연결 #{item.linkedVariantId}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{item.requesterNickname}</td>
                        <td className="px-4 py-3 text-xs tabular-nums text-neutral-500">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.status === 'PENDING' ? (
                            <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
                              <Button
                                size="sm"
                                onClick={() => goToVariantReviewApproval(item)}
                              >
                                상세/승인
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setRejectTarget(item)}
                                isLoading={rejectReviewRequest.isPending}
                              >
                                반려
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">처리 완료</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b border-neutral-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">리뷰 없는 기존 요청</h2>
              <p className="mt-1 text-xs text-neutral-500">
                이전 방식으로 접수된 하위 에디션 요청입니다. 리뷰 생성과 점수 지급은 없습니다.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left font-medium text-neutral-500">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">주류</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">추가 에디션</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">상태</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">요청자</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-500">요청일</th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-500">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {legacyItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                        리뷰 없는 기존 요청이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    legacyItems.map((item: AdminVariantRequest) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer transition-colors hover:bg-neutral-50"
                        onClick={() => {
                          if (item.masterId) {
                            navigate(`/admin/spirits/${item.masterId}`, { state: detailState })
                          }
                        }}
                      >
                        <td className="px-4 py-3 tabular-nums text-neutral-400">{item.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900">{item.masterNameKo}</p>
                          <p className="text-xs text-neutral-400">{item.masterNameEn}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900">{editionLabel(item)}</p>
                          {item.variantValueEn && (
                            <p className="text-xs text-neutral-400">
                              {[item.seriesIdentifierEn, item.variantValueEn].filter(Boolean).join(' ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.status} size="sm">
                            {LEGACY_STATUS_LABEL[item.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{item.requesterNickname ?? '-'}</td>
                        <td className="px-4 py-3 text-xs tabular-nums text-neutral-500">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.status === 'PENDING' ? (
                            <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
                              <Button
                                size="sm"
                                onClick={() => handleLegacyApprove(item.id)}
                                isLoading={approveLegacyRequest.isPending}
                              >
                                승인
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setLegacyRejectTarget(item)}
                                isLoading={rejectLegacyRequest.isPending}
                              >
                                반려
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">처리 완료</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {reviewRequests && reviewRequests.totalPages > 1 && (
            <Pagination currentPage={page} totalPages={reviewRequests.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <RejectModal
        item={rejectTarget}
        isLoading={rejectReviewRequest.isPending}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleReviewReject}
      />
      <RejectModal
        item={legacyRejectTarget}
        isLoading={rejectLegacyRequest.isPending}
        onClose={() => setLegacyRejectTarget(null)}
        onSubmit={handleLegacyReject}
      />
    </div>
  )
}
