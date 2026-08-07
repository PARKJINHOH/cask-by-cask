import { useRef, useState } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import FormFieldLabel, { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel'
import { formatDate } from '@/shared/utils/format'
import {
  useAdminRequestDetail,
  useUploadRequestImage,
  useRemoveRequestImage,
  useApproveRequestWithDetail,
  useRejectRequest,
} from '@/domain/admin/hooks/useAdminSpirits'
import SpiritFormFields, { useSpiritForm, CARD } from '@/domain/admin/components/SpiritFormFields'

// ── 상수 ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기 중', APPROVED: '승인됨', REJECTED: '반려됨',
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-24 text-sm text-neutral-400 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-sm text-neutral-800">{children}</div>
    </div>
  )
}

// ── 이미지 섹션 ──────────────────────────────────────────────────
function ImageSection({ requestId, imageUrls }: { requestId: number; imageUrls: string[] }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useUploadRequestImage()
  const remove = useRemoveRequestImage()
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        try {
          await upload.mutateAsync({ id: requestId, file })
        } catch {
          // 일부 파일 실패해도 나머지는 계속 업로드
        }
      }
    } finally {
      setUploading(false)
    }
  }

  // 여러 장 선택 시 순차 업로드.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const files = Array.from(input.files ?? [])
    await uploadFiles(files)
    input.value = ''
  }

  const handleDragOverFiles = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeaveFiles = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleDropFiles = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!e.dataTransfer.types.includes('Files')) return
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    const extRe = /\.(jpe?g|png|webp|avif)$/i
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => allowed.has(f.type) || extRe.test(f.name),
    )
    await uploadFiles(files)
  }

  const handleRemove = (url: string) => {
    if (!confirm('이미지를 삭제하시겠습니까?')) return
    remove.mutate({ id: requestId, imageUrl: url })
  }

  return (
    <div
      className={`${CARD} relative transition-colors ${isDragOver ? 'ring-2 ring-amber-400' : ''}`}
      onDragOver={handleDragOverFiles}
      onDragLeave={handleDragLeaveFiles}
      onDrop={handleDropFiles}
    >
      {isDragOver && (
        <div className="absolute inset-0 rounded-2xl bg-amber-50/90 border-2 border-dashed border-amber-400 flex items-center justify-center z-20 pointer-events-none">
          <span className="text-amber-600 font-semibold text-sm">이미지를 여기에 놓으세요</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">이미지</h3>
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} isLoading={uploading}>
          + 이미지 추가
        </Button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={handleFileChange} />
      </div>
      {imageUrls.length === 0 ? (
        <p className="text-xs text-neutral-400">등록된 이미지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {imageUrls.map((url) => (
            <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-neutral-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => handleRemove(url)}
                disabled={remove.isPending}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                  transition-opacity flex items-center justify-center text-white text-xs font-semibold"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function AdminRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const requestId = Number(id)
  const listReturnTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnTo' in location.state &&
    typeof location.state.returnTo === 'string'
      ? location.state.returnTo
      : '/admin/spirits/requests'

  const { data: req, isLoading } = useAdminRequestDetail(requestId)
  const approve = useApproveRequestWithDetail()
  const reject = useRejectRequest()

  const form = useSpiritForm({ requireProductionInfo: true })

  const [actionError, setActionError] = useState('')
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [initialized, setInitialized] = useState(false)

  // 신청 데이터 → 폼 프리필 (한 번만)
  if (req && !initialized) {
    form.prefillFromRequest(req)
    setInitialized(true)
  }

  const handleApprove = async () => {
    if (!form.validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setActionError('')
    try {
      const res = await approve.mutateAsync({ id: requestId, data: form.buildPayload() })
      navigate(`/admin/spirits/${res.data.data?.id ?? ''}`)
    } catch {
      setActionError('승인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { setActionError('반려 사유를 입력해주세요.'); return }
    setActionError('')
    try {
      await reject.mutateAsync({ id: requestId, reason: rejectReason.trim() })
      navigate(listReturnTo)
    } catch {
      setActionError('반려 처리 중 오류가 발생했습니다.')
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center py-40"><Spinner size="lg" className="text-primary-800" /></div>
  }
  if (!req) {
    return <div className="p-6"><p className="text-neutral-500">요청 데이터를 찾을 수 없습니다.</p></div>
  }

  const isPending = req.status === 'PENDING'

  return (
    // PC 에서 가로 폭을 모두 쓴다 (주류 등록/수정 화면과 동일)
    <div className="p-6 space-y-6 pb-28">
      {/* 헤더 */}
      <AdminPageHeader
        breadcrumbs={[
          { label: '주류 등록 요청', to: listReturnTo },
          { label: '요청 상세' },
        ]}
        backTo={listReturnTo}
        backLabel="요청 목록"
        title="주류 등록 요청 상세"
        badge={<Badge variant={req.status} size="md">{STATUS_LABEL[req.status]}</Badge>}
      />

      {/* 신청자 / 신청일 영역 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <Row label="신청자">{req.requesterNickname}</Row>
        <Row label="신청일">{formatDate(req.createdAt)}</Row>
        {req.note && (
          <Row label="기타 문구"><span className="whitespace-pre-wrap text-neutral-700">{req.note}</span></Row>
        )}
        {req.reviewedAt && <Row label="처리일">{formatDate(req.reviewedAt)}</Row>}
        {req.rejectReason && (
          <Row label="반려 사유"><span className="text-red-600">{req.rejectReason}</span></Row>
        )}
      </div>

      {/* 공유 폼 (좌측 하단에 이미지 카드 주입) */}
      <RequiredFieldsNotice admin />
      <SpiritFormFields
        form={form}
        imageSlot={<ImageSection requestId={requestId} imageUrls={req.imageUrls} />}
      />

      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{actionError}</p>
      )}

      {/* 반려 입력 (PENDING 시) */}
      {isPending && rejectMode && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <FormFieldLabel admin required>반려 사유</FormFieldLabel>
          <textarea required aria-required="true" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} maxLength={500}
            placeholder="반려 사유를 입력하세요..."
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <p className="text-xs text-neutral-400 text-right">{rejectReason.length}/500</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setRejectMode(false); setRejectReason('') }}>취소</Button>
            <Button variant="danger" size="sm" onClick={handleReject} isLoading={reject.isPending}>반려 확인</Button>
          </div>
        </div>
      )}

      {/* 하단 고정 액션바 */}
      {isPending && !rejectMode && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-neutral-200 pb-[env(safe-area-inset-bottom)]">
          <div className="px-6 py-3 flex justify-end gap-2">
            <Button variant="danger" onClick={() => setRejectMode(true)}>반려</Button>
            <Button onClick={handleApprove} isLoading={approve.isPending}>승인 및 등록</Button>
          </div>
        </div>
      )}
    </div>
  )
}
