import { lazy, Suspense, useRef, useState } from 'react'
import { producerApi } from '@/domain/producer/api/producerApi'
import type { ProducerLogoImage } from '@/domain/producer/types/producer.types'
import ImageLightbox from '@/shared/components/ImageLightbox'
import Modal from '@/shared/components/Modal'

// 편집기는 2800줄짜리 무거운 컴포넌트다. 로고를 실제로 고칠 때만 내려받는다.
const ImageEditorModal = lazy(() => import('@/shared/components/ImageEditorModal'))

const MAX_LOGOS = 5

interface Props {
  producerId: number
  initialLogoImages: ProducerLogoImage[]
  onChanged?: (logoImages: ProducerLogoImage[]) => void
}

/**
 * 생산자 로고 업로드 — 포토카드에 증류소 로고를 얹기 위해 도입했다.
 *
 * 최대 5장까지 등록할 수 있다(가로형·세로형·배경색이 다른 버전 등 변형을 함께 둘 수 있게).
 * 0번(맨 앞, "대표")이 포토카드에서 주류를 고를 때 자동으로 채워지는 로고다.
 * 나머지는 포토카드 편집기의 "생산자 로고" 패널에서 사용자가 직접 골라 쓸 수 있다.
 *
 * 생산자 저장(PUT)과 분리한 이유: UpdateProducerRequest 는 "null = 변경 안 함" 규약이라
 * 폼 필드로는 목록 편집(추가·삭제·순서변경)을 표현할 수 없다. 그래서 업로드/삭제/순서변경
 * 전용 엔드포인트를 따로 쓰고, 서버가 그때그때 갱신된 전체 목록을 돌려준다.
 * 같은 이유로 신규 생성 화면에는 나오지 않는다(id 가 있어야 붙일 수 있다).
 *
 * 관리자 화면은 한국어 고정 (AGENTS.md)
 */
export default function ProducerLogoField({ producerId, initialLogoImages, onChanged }: Props) {
  const [logos, setLogos] = useState<ProducerLogoImage[]>(initialLogoImages)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [zoomIndex, setZoomIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const apply = (next: ProducerLogoImage[]) => {
    setLogos(next)
    onChanged?.(next)
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      apply(await producerApi.uploadLogo(producerId, file))
    } catch {
      setError('업로드에 실패했습니다. 10MB 이하 이미지인지, 5장을 넘지 않았는지 확인해주세요.')
    } finally {
      setBusy(false)
    }
  }

  /**
   * 편집(교체) = 원본을 지우고 편집본을 새로 올리는 것.
   * 새로 올린 파일은 맨 뒤에 붙으므로, 편집한 자리가 0번("대표")이었다면 그대로 두면
   * 조용히 다른 로고가 대표 자리를 넘겨받는다 — 원래 있던 위치로 순서를 되돌린다.
   */
  const replaceViaEdit = async (targetId: number, edited: File) => {
    const originalIndex = logos.findIndex((logo) => logo.id === targetId)
    setBusy(true)
    setError(null)
    try {
      await producerApi.deleteLogo(producerId, targetId)
      const afterUpload = await producerApi.uploadLogo(producerId, edited)
      const newLogo = afterUpload.at(-1)
      if (newLogo && originalIndex >= 0 && originalIndex < afterUpload.length - 1) {
        const reordered = afterUpload.slice(0, -1)
        reordered.splice(originalIndex, 0, newLogo)
        apply(await producerApi.reorderLogos(producerId, reordered.map((logo) => logo.id)))
      } else {
        apply(afterUpload)
      }
    } catch {
      setError('편집 결과 저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (logoId: number) => {
    setBusy(true)
    setError(null)
    try {
      apply(await producerApi.deleteLogo(producerId, logoId))
    } catch {
      setError('삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= logos.length || busy) return
    const previous = logos
    const next = [...logos]
    ;[next[index], next[target]] = [next[target], next[index]]
    // 눈에는 바로 반영하고, 서버 순서는 뒤따라 맞춘다.
    // busy 로 잠그는 이유: 화살표를 연달아 누르면 요청이 겹쳐 순서가 꼬일 수 있다.
    setBusy(true)
    setLogos(next)
    try {
      apply(await producerApi.reorderLogos(producerId, next.map((logo) => logo.id)))
    } catch {
      setError('순서 변경에 실패했습니다.')
      setLogos(previous) // 서버 반영에 실패했으니 이 조작 직전 상태로 되돌린다.
    } finally {
      setBusy(false)
    }
  }

  const editing = logos.find((logo) => logo.id === editingId)
  const deleting = logos.find((logo) => logo.id === deletingId)

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="block text-xs font-medium text-neutral-600">
        로고 이미지 <span className="text-neutral-400">— 포토카드에 사용됩니다 (최대 {MAX_LOGOS}장)</span>
      </label>
      <p className="text-[11px] leading-relaxed text-neutral-400">
        배경이 투명한 PNG를 권장합니다. 카드 배경색과 상관없이 자연스럽게 얹힙니다.
        여러 버전(가로형·세로형·배경색이 다른 버전 등)을 함께 올려 두면 포토카드에서 상황에 맞게 골라 쓸 수 있습니다.
      </p>

      {logos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {logos.map((logo, index) => (
            <div key={logo.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() => setZoomIndex(index)}
                className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-neutral-50 hover:opacity-90"
              >
                <img src={logo.imageUrl} alt={`로고 ${index + 1}`} className="h-full w-full object-contain" />
                {/* 0번이 대표 — 포토카드가 주류 선택 시 자동으로 채우는 로고다 */}
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary-800/90 px-1 py-0.5 text-[9px] font-bold text-white">
                    대표
                  </span>
                )}
              </button>
              <div className="flex items-stretch gap-0.5 border-t border-neutral-100 p-0.5">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => { void move(index, -1) }}
                  aria-label="앞으로 옮기기"
                  className="flex size-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditingId(logo.id)}
                  className="min-h-6 flex-1 rounded px-0.5 text-[10px] font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-40"
                >
                  편집
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeletingId(logo.id)}
                  aria-label="삭제"
                  className="flex size-6 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={busy || index === logos.length - 1}
                  onClick={() => { void move(index, 1) }}
                  aria-label="뒤로 옮기기"
                  className="flex size-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {logos.length < MAX_LOGOS && (
        <label
          className={`flex h-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 text-center text-xs font-semibold text-neutral-500 hover:border-primary-400 hover:text-primary-700 ${busy ? 'pointer-events-none opacity-40' : ''}`}
        >
          {busy ? '처리 중...' : logos.length === 0 ? '로고 업로드' : '로고 추가'}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void upload(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {zoomIndex !== null && (
        <ImageLightbox
          images={logos.map((logo) => logo.imageUrl)}
          initialIndex={zoomIndex}
          open
          onClose={() => setZoomIndex(null)}
        />
      )}

      <Modal
        open={!!deleting}
        onClose={() => setDeletingId(null)}
        title="로고 삭제"
        size="sm"
      >
        <p className="text-sm leading-relaxed text-neutral-600">이 로고를 삭제할까요?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeletingId(null)}
            className="h-9 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (deleting) void remove(deleting.id)
              setDeletingId(null)
            }}
            className="h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
          >
            삭제
          </button>
        </div>
      </Modal>

      {/* 편집 결과는 곧바로 다시 올린다 — 로고는 생산자 저장(PUT)과 분리된 전용 엔드포인트를 쓴다.
          자르기부터 열어 준다. 로고는 여백을 다듬는 일이 대부분이라서다. */}
      {editing && (
        <Suspense fallback={null}>
          <ImageEditorModal
            open
            imageSrc={editing.imageUrl}
            isSaving={busy}
            onClose={() => setEditingId(null)}
            onSave={async (edited) => {
              await replaceViaEdit(editing.id, edited)
              setEditingId(null)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
