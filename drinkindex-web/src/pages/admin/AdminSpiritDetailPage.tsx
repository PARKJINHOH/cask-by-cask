import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import ImageLightbox from '@/shared/components/ImageLightbox'
import { formatDate } from '@/shared/utils/format'
import {
  useAdminSpiritDetail,
  useUpdateSpirit,
  useDeleteSpirit,
  useRestoreSpirit,
  useUploadSpiritImage,
  useDeleteSpiritImage,
  useSetPrimarySpiritImage,
} from '@/domain/admin/hooks/useAdminSpirits'
import type { AdminSpiritImageItem } from '@/domain/admin/types/admin.types'
import SpiritFormFields, { useSpiritForm, CARD } from '@/domain/admin/components/SpiritFormFields'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

// ── 상수 ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '공개', HIDDEN: '숨김', PENDING: '대기',
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
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const imageUrls = images.map((img) => img.imageUrl)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    upload.mutate({ id: spiritId, file })
    e.target.value = ''
  }

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">이미지</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          isLoading={upload.isPending}
        >
          + 이미지 추가
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {images.length === 0 ? (
        <p className="text-xs text-neutral-400">등록된 이미지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              onClick={() => setLightboxIndex(idx)}
              className="relative group aspect-square rounded-xl overflow-hidden border border-neutral-200
                cursor-zoom-in"
            >
              <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
              {img.isPrimary && (
                <span className="absolute top-1 left-1 bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  대표
                </span>
              )}
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
      )}

      <ImageLightbox
        images={imageUrls}
        initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
        open={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
      />
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function AdminSpiritDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const spiritId = Number(id)

  const { data: spirit, isLoading } = useAdminSpiritDetail(spiritId)
  const updateSpirit = useUpdateSpirit()
  const deleteSpirit = useDeleteSpirit()
  const restoreSpirit = useRestoreSpirit()

  const form = useSpiritForm()

  const { toasts, showToast, removeToast } = useToast()
  const [initialized, setInitialized] = useState(false)

  // 기존 데이터 → 폼 프리필 (한 번만)
  if (spirit && !initialized) {
    form.prefillFromSpirit(spirit)
    setInitialized(true)
  }

  const handleSave = () => {
    if (!form.validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    // 카테고리는 고정 — buildPayload의 category 값은 변경되지 않음
    updateSpirit.mutate(
      { id: spiritId, data: form.buildPayload() },
      {
        onSuccess: () => showToast('저장되었습니다.', 'success'),
        onError: () => showToast('저장 중 오류가 발생했습니다.', 'error'),
      },
    )
  }

  const handleDelete = async () => {
    if (!spirit || !confirm(`"${spirit.nameKo}"을(를) 숨김 처리하시겠습니까?`)) return
    try {
      await deleteSpirit.mutateAsync(spiritId)
      navigate('/admin/spirits')
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
    <div className="p-6 mx-auto space-y-6 pb-28 max-w-3xl lg:max-w-6xl">
      {/* 헤더 */}
      <AdminPageHeader
        breadcrumbs={[
          { label: '주류 관리', to: '/admin/spirits' },
          { label: '주류 상세' },
        ]}
        backTo="/admin/spirits"
        backLabel="주류 목록"
        title="술 상세 / 수정"
        badge={<Badge variant={spirit.status} size="md">{STATUS_LABEL[spirit.status]}</Badge>}
      />

      {/* 메타 정보 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <Row label="ID">{spirit.id}</Row>
        <Row label="평점">{spirit.avgScore != null ? Number(spirit.avgScore).toFixed(1) : '-'}</Row>
        <Row label="리뷰 수">{spirit.reviewCount}</Row>
        <Row label="등록일">{formatDate(spirit.createdAt)}</Row>
        <Row label="수정일">{formatDate(spirit.updatedAt)}</Row>
      </div>

      {/* 이미지 (메타 정보 아래 · 술 정보 위, 가로 전체) */}
      <SpiritImageSection spiritId={spiritId} images={spirit.images} />

      {/* 공유 폼 (카테고리 고정) */}
      <SpiritFormFields form={form} categoryLocked />

      {/* 저장/삭제 알림 — 상단 중앙 토스트 */}
      <Toast toasts={toasts} onRemove={removeToast} position="top-center" />

      {/* 하단 고정 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-neutral-200">
        <div className="max-w-3xl lg:max-w-6xl mx-auto px-6 py-3 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/spirits')}>목록으로</Button>
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
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteSpirit.isPending}
            >
              숨김 처리
            </Button>
          )}
          <Button onClick={handleSave} isLoading={updateSpirit.isPending}>변경사항 저장</Button>
        </div>
      </div>
    </div>
  )
}
