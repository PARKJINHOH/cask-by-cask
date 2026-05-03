import { useState } from 'react'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import Modal from '@/shared/components/Modal'
import { formatDate } from '@/shared/utils/format'
import {
  useAdminRequests,
  useApproveRequest,
  useRejectRequest,
} from '@/domain/admin/hooks/useAdminSpirits'
import type { RequestStatus, SpiritRegisterRequest } from '@/domain/admin/types/admin.types'

// ── 상수 ────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', TEQUILA: '데낄라',
  RUM: '럼', GIN: '진', VODKA: '보드카', OTHER: '기타',
}

const STATUS_OPTIONS: Array<{ value: RequestStatus; label: string }> = [
  { value: 'PENDING',  label: '대기 중' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'REJECTED', label: '반려됨' },
]

// ── 상세 모달 (승인 / 반려) ──────────────────────────────────────

interface DetailModalProps {
  request: SpiritRegisterRequest
  onClose: () => void
}

function RequestDetailModal({ request, onClose }: DetailModalProps) {
  const [rejectMode, setRejectMode]   = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError]             = useState('')
  const approve = useApproveRequest()
  const reject  = useRejectRequest()

  const handleApprove = async () => {
    setError('')
    try {
      await approve.mutateAsync(request.id)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '승인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('반려 사유를 입력해주세요.'); return }
    setError('')
    try {
      await reject.mutateAsync({ id: request.id, reason: rejectReason.trim() })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '반려 처리 중 오류가 발생했습니다.')
    }
  }

  const isPending = approve.isPending || reject.isPending

  return (
    <Modal
      open
      onClose={onClose}
      title="등록 요청 상세"
      size="md"
      closeOnOverlay={!isPending}
    >
      <div className="space-y-4">
        {/* 신청 내용 */}
        <div className="p-4 bg-neutral-50 rounded-xl space-y-2.5 text-sm">
          <Row label="상태">
            <Badge variant={request.status} size="sm">
              {STATUS_OPTIONS.find((s) => s.value === request.status)?.label ?? request.status}
            </Badge>
          </Row>
          <Row label="한글명">{request.nameKo}</Row>
          <Row label="영문명">{request.nameEn}</Row>
          <Row label="카테고리">{CATEGORY_LABEL[request.category] ?? request.category}</Row>
          <Row label="신청일">{formatDate(request.createdAt)}</Row>
          {request.reviewedAt && (
            <Row label="처리일">{formatDate(request.reviewedAt)}</Row>
          )}
          {request.rejectReason && (
            <Row label="반려 사유">
              <span className="text-red-600">{request.rejectReason}</span>
            </Row>
          )}
        </div>

        {/* 반려 사유 입력 */}
        {rejectMode && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">반려 사유</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="반려 사유를 입력하세요..."
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <p className="text-xs text-neutral-400 text-right">{rejectReason.length}/500</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* 액션 버튼 (PENDING인 경우만 표시) */}
        {request.status === 'PENDING' && (
          <div className="flex gap-2 justify-end pt-1 border-t border-neutral-100">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
              닫기
            </Button>
            {rejectMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setRejectMode(false); setRejectReason('') }}
                  disabled={isPending}
                >
                  취소
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleReject}
                  isLoading={reject.isPending}
                >
                  반려 확인
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setRejectMode(true)}
                  disabled={isPending}
                >
                  반려
                </Button>
                <Button size="sm" onClick={handleApprove} isLoading={approve.isPending}>
                  승인
                </Button>
              </>
            )}
          </div>
        )}

        {request.status !== 'PENDING' && (
          <div className="flex justify-end pt-1 border-t border-neutral-100">
            <Button variant="secondary" size="sm" onClick={onClose}>닫기</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 text-neutral-400 flex-shrink-0">{label}</span>
      <span className="text-neutral-900 font-medium">{children}</span>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminRequestPage() {
  const [status, setStatus]               = useState<RequestStatus>('PENDING')
  const [page, setPage]                   = useState(0)
  const [detailRequest, setDetailRequest] = useState<SpiritRegisterRequest | null>(null)

  const { data, isLoading } = useAdminRequests(status, page)

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">등록 요청</h1>

      {/* 필터 */}
      <div className="flex items-end gap-3 p-4 bg-white rounded-xl shadow-sm">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">상태</label>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setStatus(value); setPage(0) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  status === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">한글명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">영문명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신청일</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((req) => (
                    <tr key={req.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{req.id}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{req.nameKo}</td>
                      <td className="px-4 py-3 text-neutral-500">{req.nameEn}</td>
                      <td className="px-4 py-3">
                        <Badge variant={req.category} size="sm">
                          {CATEGORY_LABEL[req.category] ?? req.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={req.status} size="sm">
                          {STATUS_OPTIONS.find((s) => s.value === req.status)?.label ?? req.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDetailRequest(req)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium
                            transition-colors"
                        >
                          상세 보기
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {detailRequest && (
        <RequestDetailModal
          request={detailRequest}
          onClose={() => setDetailRequest(null)}
        />
      )}
    </div>
  )
}
