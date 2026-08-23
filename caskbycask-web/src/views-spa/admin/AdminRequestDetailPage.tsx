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
  useApproveRequestAsVariant,
  useRejectRequest,
} from '@/domain/admin/hooks/useAdminSpirits'
import SpiritFormFields, { useSpiritForm, CARD } from '@/domain/admin/components/SpiritFormFields'
import SpiritMasterPicker, { type PickedSpiritMaster } from '@/domain/spirit/components/SpiritMasterPicker'
import { extractApiErrorMessage } from '@/shared/utils/apiError'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

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
  const approveAsVariant = useApproveRequestAsVariant()
  const reject = useRejectRequest()

  // 신청자가 고른 대상이 있으면 그대로 이어받고, 없으면 관리자가 직접 찾는다.
  const [targetSpirit, setTargetSpirit] = useState<PickedSpiritMaster | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const form = useSpiritForm({ requireProductionInfo: true })

  const [actionError, setActionError] = useState('')
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [initialized, setInitialized] = useState(false)

  // 신청 데이터 → 폼 프리필 (한 번만)
  if (req && !initialized) {
    form.prefillFromRequest(req)
    if (req.targetSpirit) {
      setTargetSpirit({
        id: req.targetSpirit.id,
        nameKo: req.targetSpirit.nameKo,
        nameEn: req.targetSpirit.nameEn,
        category: req.category,
      })
    }
    setInitialized(true)
  }

  const handleApprove = async () => {
    if (!form.validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    // 기존 주류에 붙이려면 붙일 에디션이 있어야 한다.
    // 서버도 막지만 메시지가 일반적이라, 무엇을 고쳐야 하는지 여기서 알려준다.
    if (targetSpirit && (!form.isVariantSplit || form.variants.length === 0)) {
      setActionError('에디션 유형을 고르고 에디션을 1건 추가해야 기존 주류에 붙일 수 있습니다.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setActionError('')
    try {
      const data = form.buildPayload()
      const res = targetSpirit
        ? await approveAsVariant.mutateAsync({ id: requestId, targetSpiritId: targetSpirit.id, data })
        : await approve.mutateAsync({ id: requestId, data })
      navigate(`/admin/spirits/${res.data.data?.id ?? ''}`)
    } catch (e) {
      // 중복 에디션·카테고리 불일치처럼 서버만 아는 이유가 있다 — 그대로 보여 준다.
      setActionError(extractApiErrorMessage(e, '승인 처리 중 오류가 발생했습니다.'))
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
      {/* 기존 주류의 에디션으로 등록 — 신청자가 새 주류로 올렸지만 실은 이미 있는 술의
          새 배치·빈티지인 경우가 잦다. 그대로 승인하면 같은 술의 마스터가 둘이 된다. */}
      <div className={CARD}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700">기존 주류의 에디션으로 등록</h3>
            <p className="mt-0.5 text-xs text-neutral-400">
              대상 주류를 지정하면 새 주류를 만들지 않고 그 주류의 하위 에디션으로 등록됩니다.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
            {targetSpirit ? '주류 변경' : '주류 검색'}
          </Button>
        </div>

        {targetSpirit ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-[11px] font-semibold text-amber-700">
              {req.targetSpirit && req.targetSpirit.id === targetSpirit.id
                ? '신청자가 지정한 주류입니다'
                : '관리자가 지정한 주류입니다'}
            </p>
            <p className="mt-1 text-sm font-bold text-neutral-900">{targetSpirit.nameKo}</p>
            <p className="text-xs text-neutral-500">{targetSpirit.nameEn}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
              이름·생산자·국가·산지는 이 주류에서 복사되고, 아래 에디션 1건이 하위로 등록됩니다.
            </p>
            <button
              type="button"
              onClick={() => setTargetSpirit(null)}
              className="mt-2 text-xs font-semibold text-neutral-500 hover:text-neutral-700 hover:underline"
            >
              해제하고 새 주류로 등록
            </button>
          </div>
        ) : (
          <p className="text-xs text-neutral-400">
            지정하지 않으면 기존과 동일하게 새 주류로 등록됩니다.
          </p>
        )}
      </div>

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
          <AutoGrowTextarea required aria-required="true" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} maxLength={500}
            placeholder="반려 사유를 입력하세요..."
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-400" />
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
            <Button onClick={handleApprove} isLoading={approve.isPending || approveAsVariant.isPending}>
              {targetSpirit ? '승인 및 에디션 추가' : '승인 및 등록'}
            </Button>
          </div>
        </div>
      )}

      <SpiritMasterPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setTargetSpirit}
        category={req.category}
        admin
      />
    </div>
  )
}
