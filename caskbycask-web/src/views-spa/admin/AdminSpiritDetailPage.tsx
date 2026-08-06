import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import ImageLightbox from '@/shared/components/ImageLightbox'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel'
import { adminSpiritApi } from '@/domain/admin/api/adminSpiritApi'
import { formatDate, scoreColor } from '@/shared/utils/format'
import {
  useAdminSpiritDetail,
  useUpdateSpirit,
  useDeleteSpirit,
  usePermanentlyDeleteSpirit,
  useRestoreSpirit,
  useUploadSpiritImage,
  useDeleteSpiritImage,
  useSetPrimarySpiritImage,
  useReorderSpiritImages,
  useApproveSavedVariantReviewRequest,
  useRejectSavedVariantReviewRequest,
} from '@/domain/admin/hooks/useAdminSpirits'
import type {
  AdminSpiritImageItem,
  AdminSpiritVariant,
  AdminVariantReviewRequest,
  CreateVariantRequest,
} from '@/domain/admin/types/admin.types'
import SpiritFormFields, { useSpiritForm, CARD } from '@/domain/admin/components/SpiritFormFields'
import AdminSpiritReviewPanel from '@/domain/admin/components/AdminSpiritReviewPanel'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

// ── 상수 ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '공개', HIDDEN: '숨김', PENDING: '대기',
}

type ListReturnState = {
  returnTo?: string
  variantReviewApproval?: AdminVariantReviewRequest
}

function getAdminSpiritListReturnTo(state: unknown) {
  const returnTo = (state as ListReturnState | null)?.returnTo
  if (!returnTo) return '/admin/spirits'
  return /^(\/(ko|en))?\/admin\/spirits($|\?|\/variant-requests($|\?))/.test(returnTo)
    ? returnTo
    : '/admin/spirits'
}

function getVariantReviewApprovalState(state: unknown, spiritId: number) {
  const request = (state as ListReturnState | null)?.variantReviewApproval
  if (!request || request.status !== 'PENDING' || request.masterId !== spiritId) return null
  return request
}

function approvalVariantTempId(requestId: number) {
  return `variant-review-approval-${requestId}`
}

function normalizedText(value?: string | null) {
  return (value ?? '').trim().toLowerCase()
}

function buildApprovalVariant(request: AdminVariantReviewRequest): CreateVariantRequest & { tempId: string } {
  const variantType =
    request.variantType && request.variantType !== 'NONE'
      ? request.variantType
      : 'BATCH'

  return {
    tempId: approvalVariantTempId(request.id),
    variantType,
    variantValue: request.variantValue ?? '',
    variantValueEn: request.variantValueEn ?? '',
    seriesIdentifier: request.seriesIdentifier ?? '',
    seriesIdentifierEn: request.seriesIdentifierEn ?? '',
    abv: request.abv,
    volumeMl: request.volumeMl,
    commonDetail: {
      isNas: false,
      ageStatement: null,
      ageStatementMonths: null,
      ageStatementMin: null,
      ageStatementMinMonths: null,
      ageStatementMax: null,
      ageStatementMaxMonths: null,
      distilledDate: null,
      bottledDate: null,
      releaseDate: null,
      bottleNo: null,
      batchNo: variantType === 'BATCH' ? request.variantValue : null,
      totalBottles: null,
    },
  }
}

function findApprovalVariantIndex(variants: CreateVariantRequest[], request: AdminVariantReviewRequest | null) {
  if (!request) return -1
  const tempId = approvalVariantTempId(request.id)
  const tempIndex = variants.findIndex((variant) => (variant as any).tempId === tempId)
  if (tempIndex >= 0) return tempIndex
  const requestValue = normalizedText(request.variantValue)
  return variants.findIndex((variant) => normalizedText(variant.variantValue) === requestValue)
}

function findSavedApprovalVariant(
  variants: AdminSpiritVariant[],
  formVariant: CreateVariantRequest,
) {
  const variantValue = normalizedText(formVariant.variantValue)
  const candidates = variants
    .filter((variant) => variant.status === 'ACTIVE')
    .filter((variant) => normalizedText(variant.variantValue) === variantValue)
    .sort((a, b) => b.id - a.id)

  if (candidates.length === 0) return null

  const specMatched = candidates.find((variant) =>
    (formVariant.abv == null || Number(variant.abv) === Number(formVariant.abv))
    && (formVariant.volumeMl == null || Number(variant.volumeMl) === Number(formVariant.volumeMl))
  )

  return specMatched ?? candidates[0]
}

function focusAdminField(fieldKey: string) {
  window.setTimeout(() => {
    const target = document.querySelector<HTMLElement>(`[data-field="${fieldKey}"], [name="${fieldKey}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target?.focus()
  }, 0)
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
function SpiritImageSection({ spiritId, images }: { spiritId: number; images: AdminSpiritImageItem[] }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useUploadSpiritImage()
  const deleteImg = useDeleteSpiritImage()
  const setPrimary = useSetPrimarySpiritImage()
  const reorder = useReorderSpiritImages()
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [order, setOrder] = useState(images)
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragIndexRef = useRef<number | null>(null)
  const [editingImage, setEditingImage] = useState<AdminSpiritImageItem | null>(null)

  const handleEditSave = async (file: File) => {
    if (!editingImage) return
    setUploading(true)
    try {
      const oldImageId = editingImage.id
      const wasPrimary = editingImage.isPrimary
      const oldIds = new Set(images.map((img) => img.id))

      // 1. 새 이미지 업로드
      await upload.mutateAsync({ id: spiritId, file })

      // 2. 최신 이미지 목록에서 새로 추가된 이미지 검색
      const res = await adminSpiritApi.getById(spiritId)
      const newImages = res.data.data?.images ?? []
      const newImage = newImages.find((img) => !oldIds.has(img.id))

      if (newImage) {
        // 3. 기존 순서 유지하며 기존 이미지 ID를 새 이미지 ID로 대체
        const nextOrderIds = order.map((img) => (img.id === oldImageId ? newImage.id : img.id))

        // 4. 기존 이미지 삭제 (백엔드 reorder 시점에 이미지 목록 정합성 검증 통과를 위함)
        await deleteImg.mutateAsync({ id: spiritId, imageId: oldImageId })

        // 5. 순서 재정렬
        await reorder.mutateAsync({ id: spiritId, imageIds: nextOrderIds })

        // 6. 대표 이미지였을 경우 대표 설정 이관
        if (wasPrimary) {
          await setPrimary.mutateAsync({ id: spiritId, imageId: newImage.id })
        }
      } else {
        // 새 이미지를 찾지 못했더라도 기존 이미지 삭제 진행 (기존 흐름과 동일)
        await deleteImg.mutateAsync({ id: spiritId, imageId: oldImageId })
      }

      setEditingImage(null)
    } catch (err) {
      console.error(err)
      alert('이미지 편집 저장 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    setOrder(images)
  }, [images])

  const imageUrls = order.map((img) => img.imageUrl)

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        try {
          await upload.mutateAsync({ id: spiritId, file })
        } catch {
          // 일부 파일 실패해도 나머지는 계속 업로드
        }
      }
    } finally {
      setUploading(false)
    }
  }

  // 여러 장 선택 시 순차 업로드. (백엔드가 첫 이미지를 대표로 지정하므로 순서 보장을 위해 순차 처리)
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

  const handleDrop = (dropIdx: number) => {
    const dragIdx = dragIndexRef.current
    dragIndexRef.current = null
    if (dragIdx === null || dragIdx === dropIdx) return

    const next = [...order]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(dropIdx, 0, moved)
    setOrder(next)
    reorder.mutate({ id: spiritId, imageIds: next.map((img) => img.id) })
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
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          isLoading={uploading}
        >
          + 이미지 추가
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {order.length === 0 ? (
        <p className="text-xs text-neutral-400">등록된 이미지가 없습니다.</p>
      ) : (
        <>
        <div className="space-y-0.5">
          <p className="text-xs text-neutral-400">이미지를 드래그하여 순서를 변경할 수 있습니다. 맨 왼쪽(1번)이 대표 이미지입니다.</p>
          <p className="text-xs text-neutral-400">좌측 상단에 체커보드 패턴이 보이면 해당 부분이 투명 처리된 이미지입니다.</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {order.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => { dragIndexRef.current = idx }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleDrop(idx) }}
              onClick={() => setLightboxIndex(idx)}
              className="relative group aspect-square rounded-xl overflow-hidden border border-neutral-200
                bg-white cursor-grab active:cursor-grabbing"
            >
              <div className="absolute top-0 left-0 w-1/3 h-1/3 checker-corner" />
              <img src={img.imageUrl} alt="" className="relative w-full h-full object-cover pointer-events-none" />
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-semibold">
                {idx + 1}
              </span>
              {img.isPrimary && (
                <span className="absolute top-1 left-1 bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  대표
                </span>
              )}
              {/* 편집 — 우측 상단 X버튼 왼쪽 */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingImage(img)
                }}
                className="absolute top-1 right-8 z-10 w-6 h-6 flex items-center justify-center rounded-full
                  bg-amber-600/80 text-white text-xs leading-none opacity-0 group-hover:opacity-100
                  transition-opacity hover:bg-amber-600"
                aria-label="이미지 편집"
                title="이미지 편집"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              {/* 삭제 — 우측 상단 */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('이미지를 삭제하시겠습니까?'))
                    deleteImg.mutate({ id: spiritId, imageId: img.id })
                }}
                disabled={deleteImg.isPending}
                className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded-full
                  bg-red-500/80 text-white text-sm leading-none opacity-0 group-hover:opacity-100
                  transition-opacity hover:bg-red-500 disabled:opacity-50"
                aria-label="이미지 삭제"
              >
                ✕
              </button>
              {!img.isPrimary && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                  transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPrimary.mutate({ id: spiritId, imageId: img.id }) }}
                    disabled={setPrimary.isPending}
                    className="text-white text-xs font-semibold px-2 py-1 bg-amber-600/90 rounded
                      hover:bg-amber-700 disabled:opacity-50"
                  >
                    대표 설정
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}

      <ImageLightbox
        images={imageUrls}
        initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
        open={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
      />

      {editingImage && (
        <ImageEditorModal
          open={!!editingImage}
          onClose={() => setEditingImage(null)}
          imageSrc={editingImage.imageUrl}
          onSave={handleEditSave}
          isSaving={uploading}
        />
      )}
    </div>
  )
}



// ── 메인 페이지 ────────────────────────────────────────────────
export default function AdminSpiritDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const spiritId = Number(id)
  const listReturnTo = getAdminSpiritListReturnTo(location.state)
  const variantReviewApproval = getVariantReviewApprovalState(location.state, spiritId)
  const goList = () => navigate(listReturnTo)

  const { data: spirit, isLoading } = useAdminSpiritDetail(spiritId)
  const updateSpirit = useUpdateSpirit()
  const approveSavedVariantReview = useApproveSavedVariantReviewRequest()
  const rejectSavedVariantReview = useRejectSavedVariantReviewRequest()
  const deleteSpirit = useDeleteSpirit()
  const permanentlyDeleteSpirit = usePermanentlyDeleteSpirit()
  const restoreSpirit = useRestoreSpirit()

  const form = useSpiritForm({ requireProductionInfo: true })

  const { toasts, showToast, removeToast } = useToast()
  const [initialized, setInitialized] = useState(false)
  const [activeTab, setActiveTab] = useState<'detail' | 'reviews'>('detail')
  const [reviewApprovalChecked, setReviewApprovalChecked] = useState(false)
  const [reviewRejectedChecked, setReviewRejectedChecked] = useState(false)
  const [reviewRejectReason, setReviewRejectReason] = useState('')

  // 기존 데이터 → 폼 프리필 (한 번만)
  if (spirit && !initialized) {
    form.prefillFromSpirit(spirit)
    if (variantReviewApproval) {
      const approvalVariantType =
        variantReviewApproval.variantType && variantReviewApproval.variantType !== 'NONE'
          ? variantReviewApproval.variantType
          : 'BATCH'
      const resolvedSeriesIdentifier =
        spirit.seriesIdentifier
        ?? spirit.variants?.find((variant) => variant.seriesIdentifier)?.seriesIdentifier
        ?? variantReviewApproval.seriesIdentifier
        ?? ''
      const resolvedSeriesIdentifierEn =
        spirit.seriesIdentifierEn
        ?? spirit.variants?.find((variant) => variant.seriesIdentifierEn)?.seriesIdentifierEn
        ?? variantReviewApproval.seriesIdentifierEn
        ?? ''

      form.setIsVariantSplit(true)
      form.setVariantType(approvalVariantType)
      form.setSeriesIdentifier(resolvedSeriesIdentifier)
      form.setSeriesIdentifierEn(resolvedSeriesIdentifierEn)
      form.setVariants((prev) => {
        const requestValue = normalizedText(variantReviewApproval.variantValue)
        const tempId = approvalVariantTempId(variantReviewApproval.id)
        const hasSameVariant = prev.some((variant) => normalizedText(variant.variantValue) === requestValue)
        const hasSeed = prev.some((variant) => (variant as any).tempId === tempId)
        if (hasSeed) return prev
        if (hasSameVariant) {
          return prev.map((variant) =>
            normalizedText(variant.variantValue) === requestValue
              ? { ...variant, tempId }
              : variant
          )
        }
        return [...prev, buildApprovalVariant(variantReviewApproval)]
      })
    }
    setInitialized(true)
  }

  const approvalVariantIndex = findApprovalVariantIndex(form.variants, variantReviewApproval)
  const isApprovalMode = !!variantReviewApproval
  const isSaving = updateSpirit.isPending || approveSavedVariantReview.isPending || rejectSavedVariantReview.isPending

  const validateApprovalVariantSpecs = () => {
    if (!variantReviewApproval) return true
    if (approvalVariantIndex < 0 || !form.variants[approvalVariantIndex]) {
      setActiveTab('detail')
      showToast('승인할 하위 에디션을 찾을 수 없습니다.', 'error')
      return false
    }

    const variant = form.variants[approvalVariantIndex]
    const nextErrors: Record<string, string> = {}
    if (variant.abv == null || Number.isNaN(Number(variant.abv)) || Number(variant.abv) < 0 || Number(variant.abv) > 100) {
      nextErrors[`variantAbv_${approvalVariantIndex}`] = '승인할 에디션의 알코올 도수는 필수입니다.'
    }
    if (variant.volumeMl == null || Number.isNaN(Number(variant.volumeMl)) || Number(variant.volumeMl) < 1 || Number(variant.volumeMl) > 100000) {
      nextErrors[`variantVolumeMl_${approvalVariantIndex}`] = '승인할 에디션의 용량은 필수입니다.'
    }

    if (Object.keys(nextErrors).length === 0) return true

    form.setErrors((prev) => ({ ...prev, ...nextErrors }))
    setActiveTab('detail')
    focusAdminField(Object.keys(nextErrors)[0])
    return false
  }

  const handleSave = async () => {
    if (variantReviewApproval && reviewRejectedChecked && !reviewRejectReason.trim()) {
      setActiveTab('reviews')
      showToast('리뷰 미승인 사유를 입력해주세요.', 'error')
      return
    }

    if (activeTab !== 'detail') {
      setActiveTab('detail')
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    }

    if (!form.validate()) {
      setActiveTab('detail')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!validateApprovalVariantSpecs()) return

    try {
      const approvalVariantSnapshot =
        variantReviewApproval && approvalVariantIndex >= 0
          ? { ...form.variants[approvalVariantIndex] }
          : null

      // 카테고리는 고정 — buildPayload의 category 값은 변경되지 않음
      await updateSpirit.mutateAsync({ id: spiritId, data: form.buildPayload() })

      if (variantReviewApproval && approvalVariantSnapshot) {
        const variantsResponse = await adminSpiritApi.getVariants(spiritId)
        const targetVariant = findSavedApprovalVariant(variantsResponse.data.data ?? [], approvalVariantSnapshot)
        if (!targetVariant) {
          throw new Error('approval variant not found')
        }

        if (reviewRejectedChecked) {
          await rejectSavedVariantReview.mutateAsync({
            id: variantReviewApproval.id,
            targetVariantId: targetVariant.id,
            reason: reviewRejectReason.trim(),
          })
          showToast('하위 에디션은 등록되고 리뷰는 미승인 처리되었습니다.', 'success')
        } else {
          await approveSavedVariantReview.mutateAsync({
            id: variantReviewApproval.id,
            targetVariantId: targetVariant.id,
          })
          showToast('하위 에디션과 리뷰가 등록되었습니다.', 'success')
        }
        navigate(location.pathname, { replace: true, state: { returnTo: listReturnTo } })
      } else {
        showToast('저장되었습니다.', 'success')
      }
    } catch {
      showToast(
        variantReviewApproval
          ? '저장 또는 하위 에디션/리뷰 승인 중 오류가 발생했습니다.'
          : '저장 중 오류가 발생했습니다.',
        'error',
      )
    }
  }

  const handleDelete = async () => {
    if (!spirit || !confirm(`"${spirit.nameKo}"을(를) 숨김 처리하시겠습니까?`)) return
    try {
      await deleteSpirit.mutateAsync(spiritId)
      goList()
    } catch {
      showToast('숨김 처리 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleRestore = async () => {
    if (!spirit || !confirm(`"${spirit.nameKo}"의 숨김을 해제하시겠습니까?`)) return
    try {
      await restoreSpirit.mutateAsync(spiritId)
      showToast('숨김이 해제되었습니다.', 'success')
    } catch {
      showToast('숨김 해제 중 오류가 발생했습니다.', 'error')
    }
  }

  const handlePermanentDelete = async () => {
    if (!spirit || !confirm(`"${spirit.nameKo}"을(를) 영구 삭제하시겠습니까?\n\n주류 정보와 연결된 이미지가 삭제되며 복구할 수 없습니다.`)) return
    try {
      await permanentlyDeleteSpirit.mutateAsync(spiritId)
      goList()
    } catch {
      showToast('삭제 중 오류가 발생했습니다. 연결된 리뷰/가격 제보 등이 있으면 먼저 숨김 처리를 사용하세요.', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Spinner size="lg" className="text-primary-800" />
      </div>
    )
  }

  if (!spirit) {
    return <div className="p-6"><p className="text-neutral-500">데이터를 찾을 수 없습니다.</p></div>
  }

  return (
    // PC 에서 가로 폭을 모두 쓴다 — 위스키는 3열(캐스크 전용 컬럼)이라 폭이 넓을수록 유리하다
    <div className="p-6 space-y-6 pb-28">
      {/* 헤더 */}
      <AdminPageHeader
        breadcrumbs={[
          { label: '주류 관리', to: listReturnTo },
          { label: '주류 상세' },
        ]}
        backTo={listReturnTo}
        useBackToPath
        backLabel="주류 목록"
        title="주류 상세 / 수정"
        badge={<Badge variant={spirit.status} size="md">{STATUS_LABEL[spirit.status]}</Badge>}
      />

      {/* 메타 정보 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <Row label="ID">{spirit.id}</Row>
        <Row label="평점">
          {spirit.avgScore != null ? (
            <span
              className="font-semibold tabular-nums"
              style={{ color: scoreColor(Number(spirit.avgScore)) }}
            >
              {Number(spirit.avgScore).toFixed(1)}
            </span>
          ) : '-'}
        </Row>
        <Row label="리뷰 수">{spirit.reviewCount}</Row>
        <Row label="등록일">{formatDate(spirit.createdAt)}</Row>
        <Row label="수정일">{formatDate(spirit.updatedAt)}</Row>
      </div>

      {variantReviewApproval && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">하위 에디션/리뷰 승인 검수 중</p>
              <p className="mt-1 text-sm text-amber-800">
                사용자 입력값을 하위 에디션 목록에 반영했습니다. 상세 정보를 확인/수정한 뒤 리뷰 탭에서 리뷰 검수 완료 또는 리뷰 미승인을 선택하면 저장할 수 있습니다.
              </p>
              <p className="mt-2 text-xs text-amber-700">
                요청 에디션: {[variantReviewApproval.seriesIdentifier, variantReviewApproval.variantValue].filter(Boolean).join(' ')}
                {' · '}
                {variantReviewApproval.abv}% / {variantReviewApproval.volumeMl}ml
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setActiveTab('reviews')}>
              리뷰 확인
            </Button>
          </div>
        </div>
      )}

      {/* 이미지 (메타 정보 아래 · 술 정보 위, 가로 전체) */}
      <div className="flex gap-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setActiveTab('detail')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'detail'
              ? 'border-primary-800 text-primary-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          상세 정보
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'reviews'
              ? 'border-primary-800 text-primary-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          리뷰
        </button>
      </div>

      {activeTab === 'detail' ? (
        <>
          {spirit.sourceProvider === 'VIVINO' && spirit.sourceImageUrl && (
            <section className="mb-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-neutral-900">수집 대표 이미지 미리보기</h2>
                  <p className="mt-1 text-xs text-neutral-500">숨김 상태에서도 라이선스 문의용 화면을 촬영할 수 있습니다.</p>
                </div>
                {spirit.sourceUrl && (
                  <a href={spirit.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 underline">
                    원문 열기
                  </a>
                )}
              </div>
              <div className="relative mx-auto aspect-[4/5] max-w-xs overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                <img src={spirit.sourceImageUrl} alt={`${spirit.nameKo} 대표 이미지`} className="h-full w-full object-contain" />
                {spirit.sourceRating != null && (
                  <div className="absolute bottom-3 right-3 rounded-xl bg-[#a61f5e]/95 px-3 py-2 text-right text-white shadow-lg">
                    <div className="text-[10px] font-black tracking-[0.18em]">
                      VIVINO{spirit.sourceUrl?.includes('/fixture-') ? ' · SAMPLE' : ''}
                    </div>
                    <div className="mt-0.5 text-xl font-black leading-none">
                      {spirit.sourceRating.toFixed(1)}
                      {spirit.sourceRatingCount != null && (
                        <span className="ml-1 text-[10px] font-medium opacity-80">({spirit.sourceRatingCount.toLocaleString()})</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
          <SpiritImageSection spiritId={spiritId} images={spirit.images} />



      {/* 공유 폼 (카테고리 고정) */}
          <RequiredFieldsNotice admin className="mb-4" />
          <SpiritFormFields
            form={form}
            categoryLocked
            activeVariantIndex={approvalVariantIndex >= 0 ? approvalVariantIndex : null}
          />
        </>
      ) : (
        <AdminSpiritReviewPanel
          spiritId={spiritId}
          pendingVariantReview={variantReviewApproval}
          reviewApprovalChecked={reviewApprovalChecked}
          reviewRejectedChecked={reviewRejectedChecked}
          reviewRejectReason={reviewRejectReason}
          onReviewApprovalCheckedChange={(checked) => {
            setReviewApprovalChecked(checked)
            if (checked) {
              setReviewRejectedChecked(false)
              setReviewRejectReason('')
            }
          }}
          onReviewRejectedCheckedChange={(checked) => {
            setReviewRejectedChecked(checked)
            if (checked) setReviewApprovalChecked(false)
          }}
          onReviewRejectReasonChange={setReviewRejectReason}
        />
      )}

      {/* 저장/삭제 알림 — 상단 중앙 토스트 */}
      <Toast toasts={toasts} onRemove={removeToast} position="top-center" />

      {/* 하단 고정 액션바 */}
      {(activeTab === 'detail' || isApprovalMode) && (
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-neutral-200">
        <div className="px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {isApprovalMode ? (
            <p className="text-xs text-neutral-500">
              리뷰 탭에서 미승인 리뷰를 확인하고 검수 완료 또는 리뷰 미승인을 선택해야 저장됩니다.
            </p>
          ) : (
            <span />
          )}
          <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={goList}>목록으로</Button>
          {spirit.status === 'HIDDEN' ? (
            <Button
              variant="secondary"
              onClick={handleRestore}
              isLoading={restoreSpirit.isPending}
            >
              숨김 해제
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleDelete}
              isLoading={deleteSpirit.isPending}
            >
              숨김 처리
            </Button>
          )}
          <Button
            variant="danger"
            onClick={handlePermanentDelete}
            isLoading={permanentlyDeleteSpirit.isPending}
          >
            삭제
          </Button>
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isApprovalMode && !reviewApprovalChecked && !reviewRejectedChecked}
          >
            변경사항 저장
          </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
