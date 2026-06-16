import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
  usePermanentlyDeleteSpirit,
  useRestoreSpirit,
  useUploadSpiritImage,
  useDeleteSpiritImage,
  useSetPrimarySpiritImage,
  useReorderSpiritImages,
  useAdminSpiritVariants,
  useAddSpiritVariant,
  useRemoveSpiritVariant,
} from '@/domain/admin/hooks/useAdminSpirits'
import { adminSpiritApi } from '@/domain/admin/api/adminSpiritApi'
import type { AdminSpiritImageItem, AdminSpiritItem } from '@/domain/admin/types/admin.types'
import SpiritFormFields, { useSpiritForm, CARD } from '@/domain/admin/components/SpiritFormFields'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

// ── 상수 ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '공개', HIDDEN: '숨김', PENDING: '대기',
}

type ListReturnState = { returnTo?: string }

function getAdminSpiritListReturnTo(state: unknown) {
  const returnTo = (state as ListReturnState | null)?.returnTo
  if (!returnTo) return '/admin/spirits'
  return returnTo === '/admin/spirits' || returnTo.startsWith('/admin/spirits?')
    ? returnTo
    : '/admin/spirits'
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
    </div>
  )
}

// ── 연관 술(다른 배치·병입) 섹션 — 이미지 아래, 가로 영역 ───────────
function SpiritVariantsSection({ spiritId }: { spiritId: number }) {
  const { data: variants = [], isLoading } = useAdminSpiritVariants(spiritId)
  const addVariant = useAddSpiritVariant()
  const removeVariant = useRemoveSpiritVariant()

  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<AdminSpiritItem[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const linkedIds = new Set(variants.map((v) => v.id))

  // 디바운스 검색 (관리자 술 목록 재사용)
  useEffect(() => {
    const q = keyword.trim()
    if (q.length < 1) { setResults([]); setSearching(false); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await adminSpiritApi.list({ keyword: q, page: 0, size: 8 })
        setResults(res.data.data?.content ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword])

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const handleAdd = (target: AdminSpiritItem) => {
    addVariant.mutate(
      { id: spiritId, targetId: target.id },
      { onSuccess: () => { setKeyword(''); setResults([]); setOpen(false) } },
    )
  }

  const handleRemove = (targetId: number) => {
    removeVariant.mutate({ id: spiritId, targetId })
  }

  return (
    <div className={CARD}>
      <div>
        <h3 className="text-sm font-semibold text-neutral-700">연관 술 (다른 배치·병입)</h3>
        <p className="mt-0.5 text-xs text-neutral-400">
          이름이 같으면 자동 연결됩니다. 아래 검색으로 다른 술을 직접 추가하거나, ✕ 로 제거할 수 있어요. (연결은 양방향)
        </p>
      </div>

      {/* 검색 추가 */}
      <div ref={boxRef} className="relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white focus-within:border-amber-400">
          <svg className="w-4 h-4 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="연관시킬 술 이름 검색…"
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>

        {open && keyword.trim() && (
          <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
            {searching && (
              <div className="py-6 text-center text-sm text-neutral-400">검색 중…</div>
            )}
            {!searching && results.length === 0 && (
              <div className="py-6 text-center text-sm text-neutral-400">검색 결과가 없습니다.</div>
            )}
            {!searching && results.map((s) => {
              const isSelf = s.id === spiritId
              const isLinked = linkedIds.has(s.id)
              const disabled = isSelf || isLinked || addVariant.isPending
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleAdd(s)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 transition-colors
                    border-b border-neutral-50 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {s.primaryImageUrl ? (
                    <img src={s.primaryImageUrl} alt="" className="w-9 h-9 rounded object-cover bg-neutral-100 shrink-0" />
                  ) : (
                    <span className="w-9 h-9 rounded bg-neutral-100 flex items-center justify-center text-base shrink-0">🍶</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-neutral-800 truncate">{s.nameKo}</span>
                    {s.nameEn && <span className="block text-xs text-neutral-400 truncate">{s.nameEn}</span>}
                  </span>
                  {isSelf ? (
                    <span className="text-[11px] text-neutral-400 shrink-0">현재 술</span>
                  ) : isLinked ? (
                    <span className="text-[11px] text-amber-600 shrink-0">연결됨</span>
                  ) : (
                    <span className="text-[11px] text-neutral-400 shrink-0">+ 추가</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 연결된 술 가로 목록 */}
      {isLoading ? (
        <div className="py-6 flex justify-center"><Spinner size="sm" className="text-primary-800" /></div>
      ) : variants.length === 0 ? (
        <p className="text-xs text-neutral-400">연결된 술이 없습니다.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {variants.map((v) => (
            <div
              key={v.id}
              className="relative shrink-0 w-36 rounded-xl border border-neutral-200 bg-white overflow-hidden"
            >
              {/* 제거 */}
              <button
                type="button"
                onClick={() => handleRemove(v.id)}
                disabled={removeVariant.isPending}
                className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded-full
                  bg-red-500/80 text-white text-sm leading-none hover:bg-red-500 disabled:opacity-50"
                aria-label="연관 술 제거"
              >
                ✕
              </button>

              <div className="aspect-square bg-neutral-100">
                {v.primaryImageUrl ? (
                  <img src={v.primaryImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-neutral-300">🍶</div>
                )}
              </div>

              <div className="p-2 space-y-1">
                <p className="text-xs font-semibold text-neutral-800 leading-tight line-clamp-2">{v.nameKo}</p>
                {v.bottledDate && <p className="text-[11px] text-neutral-400">병입 {v.bottledDate}</p>}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    v.origin === 'MANUAL' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {v.origin === 'MANUAL' ? '수동' : '자동'}
                  </span>
                  {v.status !== 'ACTIVE' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-red-100 text-red-600">
                      {STATUS_LABEL[v.status] ?? v.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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
  const goList = () => navigate(listReturnTo)

  const { data: spirit, isLoading } = useAdminSpiritDetail(spiritId)
  const updateSpirit = useUpdateSpirit()
  const deleteSpirit = useDeleteSpirit()
  const permanentlyDeleteSpirit = usePermanentlyDeleteSpirit()
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
    if (!spirit || !confirm(`"${spirit.nameKo}"을(를) 영구 삭제하시겠습니까?\n\n술 정보와 연결된 이미지가 삭제되며 복구할 수 없습니다.`)) return
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
    <div className="p-6 mx-auto space-y-6 pb-28 max-w-3xl lg:max-w-6xl xl:max-w-7xl">
      {/* 헤더 */}
      <AdminPageHeader
        breadcrumbs={[
          { label: '주류 관리', to: listReturnTo },
          { label: '주류 상세' },
        ]}
        backTo={listReturnTo}
        useBackToPath
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

      {/* 연관 술 (이미지 아래, 가로 영역) */}
      <SpiritVariantsSection spiritId={spiritId} />

      {/* 공유 폼 (카테고리 고정) */}
      <SpiritFormFields form={form} categoryLocked />

      {/* 저장/삭제 알림 — 상단 중앙 토스트 */}
      <Toast toasts={toasts} onRemove={removeToast} position="top-center" />

      {/* 하단 고정 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-neutral-200">
        <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-6 py-3 flex items-center justify-end gap-2">
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
          <Button onClick={handleSave} isLoading={updateSpirit.isPending}>변경사항 저장</Button>
        </div>
      </div>
    </div>
  )
}
