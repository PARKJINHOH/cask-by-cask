import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminSpiritApi } from '@/domain/admin/api/adminSpiritApi'
import Button from '@/shared/components/Button'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import ImageLightbox from '@/shared/components/ImageLightbox'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import SpiritFormFields, { useSpiritForm, CARD, SectionTitle } from '@/domain/admin/components/SpiritFormFields'
import type { SpiritStatus } from '@/domain/spirit/types/spirit.types'

// ── 새 술 등록 (관리자 직접 등록) ───────────────────────────────────
// 폼 필드·검증·페이로드는 SpiritFormFields(단일 소스)에서 정의.
// 수정은 주류 상세(AdminSpiritDetailPage)에서 처리한다.
// 이미지는 '등록' 버튼을 눌러 술이 생성된 직후에만 업로드된다(미클릭 시 저장 안 됨).

const MAX_IMAGES = 10

export default function AdminSpiritFormPage() {
  const navigate = useNavigate()
  const form = useSpiritForm()

  const [isSaving, setIsSaving] = useState(false)
  const [saveType, setSaveType] = useState<SpiritStatus | null>(null)
  const [saveError, setSaveError] = useState('')

  // 등록 시 함께 저장할 이미지(선택만 해둠 — '등록' 클릭 전에는 서버에 저장되지 않음)
  const [images, setImages] = useState<File[]>([])
  const previews = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images])
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)) }, [previews])
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isEditingImage, setIsEditingImage] = useState(false)

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const room = Math.max(0, MAX_IMAGES - images.length)
    setImages((prev) => [...prev, ...files.slice(0, room)])
  }
  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx))

  const handleEditSave = async (file: File) => {
    if (editingIndex == null) return
    setIsEditingImage(true)
    try {
      setImages((prev) => prev.map((original, idx) => (
        idx === editingIndex
          ? new File([file], original.name.replace(/\.[^.]+$/, '') + '_edited.png', { type: file.type || 'image/png' })
          : original
      )))
      setEditingIndex(null)
    } finally {
      setIsEditingImage(false)
    }
  }

  const handleSubmit = async (status: SpiritStatus) => {
    if (!form.validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaveType(status)
    setIsSaving(true)
    setSaveError('')
    let newId: number | undefined
    try {
      const res = await adminSpiritApi.create({
        ...form.buildPayload(),
        status,
      })
      newId = res.data.data?.id
      // 술 생성 직후 이미지 업로드 (첫 이미지가 대표로 설정됨)
      for (const file of images) {
        if (newId) await adminSpiritApi.uploadImage(newId, file)
      }
      navigate(`/admin/spirits/${newId ?? ''}`)
    } catch {
      if (newId) {
        // 술은 생성됨 → 상세로 이동(중복 생성 방지). 이미지 일부 업로드 실패 가능.
        navigate(`/admin/spirits/${newId}`)
      } else {
        setSaveError('저장 중 오류가 발생했습니다.')
        setIsSaving(false)
        setSaveType(null)
      }
    }
  }

  return (
    <div className="p-6 mx-auto space-y-6 pb-28 max-w-3xl lg:max-w-6xl xl:max-w-7xl">
      <AdminPageHeader
        breadcrumbs={[
          { label: '주류 관리', to: '/admin/spirits' },
          { label: '주류 등록' },
        ]}
        backTo="/admin/spirits"
        backLabel="주류 목록"
        title="새 술 등록"
      />

      <SpiritFormFields
        form={form}
        imageSlot={
          <div className={CARD}>
            <SectionTitle title="이미지" hint="'등록'을 눌러야 저장됩니다" />
            <p className="text-xs text-neutral-400">
              첫 번째 이미지가 대표 이미지로 설정됩니다. (최대 {MAX_IMAGES}장)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {previews.map((url, i) => (
                <div
                  key={url}
                  onClick={() => setLightboxIndex(i)}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-white cursor-zoom-in"
                >
                  <div className="absolute top-0 left-0 w-1/3 h-1/3 checker-corner" />
                  <img src={url} alt="" className="relative w-full h-full object-cover pointer-events-none" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-semibold">
                      대표
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingIndex(i)
                    }}
                    aria-label="이미지 편집"
                    title="이미지 편집"
                    className="absolute top-1 right-8 z-10 w-6 h-6 flex items-center justify-center rounded-full
                      bg-amber-600/80 text-white text-xs leading-none opacity-0 group-hover:opacity-100
                      transition-opacity hover:bg-amber-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(i)
                    }}
                    aria-label="삭제"
                    className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-black/60 text-white text-sm leading-none
                      flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity"
                  >×</button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-neutral-300 flex flex-col
                  items-center justify-center cursor-pointer text-neutral-400 hover:border-amber-400
                  hover:bg-amber-50/40 hover:text-amber-500 transition-colors">
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-xs mt-1">사진 추가</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleAddImages} />
                </label>
              )}
            </div>
            <ImageLightbox
              images={previews}
              initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
              open={lightboxIndex >= 0}
              onClose={() => setLightboxIndex(-1)}
            />
            {editingIndex != null && previews[editingIndex] && (
              <ImageEditorModal
                open={editingIndex != null}
                onClose={() => setEditingIndex(null)}
                imageSrc={previews[editingIndex]}
                onSave={handleEditSave}
                isSaving={isEditingImage}
              />
            )}
          </div>
        }
      />

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
      )}

      {/* 하단 고정 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-neutral-200">
        <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-6 py-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/spirits')} disabled={isSaving}>취소</Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit('HIDDEN')}
            isLoading={isSaving && saveType === 'HIDDEN'}
            disabled={isSaving && saveType !== 'HIDDEN'}
          >
            비공개 등록
          </Button>
          <Button
            onClick={() => handleSubmit('ACTIVE')}
            isLoading={isSaving && saveType === 'ACTIVE'}
            disabled={isSaving && saveType !== 'ACTIVE'}
          >
            등록
          </Button>
        </div>
      </div>
    </div>
  )
}
