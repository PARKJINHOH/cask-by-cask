import { lazy, Suspense, useRef, useState } from 'react'
import { producerApi } from '@/domain/producer/api/producerApi'
import ImageLightbox from '@/shared/components/ImageLightbox'

// 편집기는 2800줄짜리 무거운 컴포넌트다. 로고를 실제로 고칠 때만 내려받는다.
const ImageEditorModal = lazy(() => import('@/shared/components/ImageEditorModal'))

interface Props {
  producerId: number
  initialLogoUrl: string | null
  onChanged?: (logoImageUrl: string | null) => void
}

/**
 * 생산자 로고 업로드 — 포토카드에 증류소 로고를 얹기 위해 도입했다.
 *
 * 생산자 저장(PUT)과 분리한 이유: UpdateProducerRequest 는 "null = 변경 안 함" 규약이라
 * 폼 필드로는 '삭제'를 표현할 수 없다. 그래서 업로드/삭제 전용 엔드포인트를 따로 쓴다.
 * 같은 이유로 신규 생성 화면에는 나오지 않는다(id 가 있어야 붙일 수 있다).
 *
 * 관리자 화면은 한국어 고정 (AGENTS.md)
 */
export default function ProducerLogoField({ producerId, initialLogoUrl, onChanged }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const updated = await producerApi.uploadLogo(producerId, file)
      setLogoUrl(updated?.logoImageUrl ?? null)
      onChanged?.(updated?.logoImageUrl ?? null)
    } catch {
      setError('업로드에 실패했습니다. 10MB 이하 이미지인지 확인해주세요.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('로고를 삭제할까요?')) return
    setBusy(true)
    setError(null)
    try {
      await producerApi.deleteLogo(producerId)
      setLogoUrl(null)
      onChanged?.(null)
    } catch {
      setError('삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1 sm:col-span-2">
      <label className="block text-xs font-medium text-neutral-600">
        로고 이미지 <span className="text-neutral-400">— 포토카드에 사용됩니다</span>
      </label>
      <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        {logoUrl ? (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            title="크게 보기"
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors hover:border-primary-400"
          >
            <img src={logoUrl} alt="로고" className="h-full w-full object-contain" />
          </button>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <span className="text-[10px] text-neutral-400">없음</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {busy ? '처리 중...' : logoUrl ? '로고 교체' : '로고 업로드'}
          </button>
          {logoUrl && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(true)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                편집
              </button>
              <button
                type="button"
                onClick={() => setZoomed(true)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                크게 보기
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => { void remove() }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:text-red-600 disabled:opacity-50"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          void upload(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {logoUrl && (
        <ImageLightbox images={[logoUrl]} open={zoomed} onClose={() => setZoomed(false)} />
      )}

      {/* 편집 결과는 곧바로 다시 올린다 — 로고는 생산자 저장(PUT)과 분리된 전용 엔드포인트를 쓴다.
          자르기부터 열어 준다. 로고는 여백을 다듬는 일이 대부분이라서다. */}
      {editing && logoUrl && (
        <Suspense fallback={null}>
          <ImageEditorModal
            open
            imageSrc={logoUrl}
            isSaving={busy}
            initialMode="crop"
            onClose={() => setEditing(false)}
            onSave={async (edited) => {
              await upload(edited)
              setEditing(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
