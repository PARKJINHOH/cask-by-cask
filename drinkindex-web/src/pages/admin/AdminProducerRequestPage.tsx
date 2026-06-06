import { Fragment, useState } from 'react'
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import {
  useAdminProducerRequests,
  useApproveProducerRequest,
  useRejectProducerRequest,
} from '@/domain/producer/hooks/useProducerRequest'
import type { MyProducerRequest } from '@/domain/producer/types/producerRequest.types'
import type { RequestStatus } from '@/domain/spirit/types/spiritRequest.types'

const STATUS_OPTIONS: Array<{ value: RequestStatus; label: string }> = [
  { value: 'PENDING',  label: '대기 중' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'REJECTED', label: '반려됨' },
]

interface RejectModalProps {
  open: boolean
  request: MyProducerRequest | null
  onClose: () => void
}

function RejectModal({ open, request, onClose }: RejectModalProps) {
  const [reason, setReason] = useState('')
  const reject = useRejectProducerRequest()

  const handleReject = () => {
    if (!request || !reason.trim()) return
    reject.mutate({ id: request.id, rejectReason: reason.trim() }, {
      onSuccess: () => { setReason(''); onClose() },
    })
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <DialogTitle className="text-base font-bold text-neutral-900">
                반려 사유 입력 — {request?.nameKo}
              </DialogTitle>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="반려 사유를 입력하세요 (요청자에게 알림으로 전달됩니다)"
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleReject}
                  disabled={!reason.trim()}
                  isLoading={reject.isPending}
                >
                  반려
                </Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

export default function AdminProducerRequestPage() {
  const [status, setStatus] = useState<RequestStatus>('PENDING')
  const [page, setPage] = useState(0)
  const [rejectTarget, setRejectTarget] = useState<MyProducerRequest | null>(null)
  const approve = useApproveProducerRequest()

  const { data, isLoading } = useAdminProducerRequests(status, page)

  const handleApprove = (req: MyProducerRequest) => {
    if (!confirm(`'${req.nameKo}'를 승인하시겠습니까? 생산자 DB에 자동 등록됩니다.`)) return
    approve.mutate(req.id)
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">생산자 등록 요청</h1>

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

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-800" />
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
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">국가</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신청일</th>
                  {status === 'PENDING' && (
                    <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={status === 'PENDING' ? 7 : 6}
                        className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((req) => (
                    <tr key={req.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{req.id}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{req.nameKo}</td>
                      <td className="px-4 py-3 text-neutral-500">{req.nameEn}</td>
                      <td className="px-4 py-3 text-neutral-500">{req.country}</td>
                      <td className="px-4 py-3">
                        <Badge variant={req.status} size="sm">
                          {STATUS_OPTIONS.find((s) => s.value === req.status)?.label ?? req.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums">
                        {formatDate(req.createdAt)}
                      </td>
                      {status === 'PENDING' && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(req)}
                              isLoading={approve.isPending}
                            >
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setRejectTarget(req)}
                            >
                              반려
                            </Button>
                          </div>
                        </td>
                      )}
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

      <RejectModal
        open={rejectTarget !== null}
        request={rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
    </div>
  )
}
