import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminSpiritApi } from '@/domain/admin/api/adminSpiritApi'
import Button from '@/shared/components/Button'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import SpiritFormFields, { useSpiritForm, CARD, SectionTitle } from '@/domain/admin/components/SpiritFormFields'

// ── 새 술 등록 (관리자 직접 등록) ───────────────────────────────────
// 폼 필드·검증·페이로드는 SpiritFormFields(단일 소스)에서 정의.
// 수정은 주류 상세(AdminSpiritDetailPage)에서 처리한다.
// 이미지는 '등록' 버튼을 눌러 술이 생성된 직후에만 업로드된다(미클릭 시 저장 안 됨).

const MAX_IMAGES = 10

export default function AdminSpiritFormPage() {
  const navigate = useNavigate()
  const form = useSpiritForm()

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // 등록 시 함께 저장할 이미지(선택만 해둠 — '등록' 클릭 전에는 서버에 저장되지 않음)
  const [images, setImages] = useState<File[]>([])
  const previews = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images])
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)) }, [previews])

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const room = Math.max(0, MAX_IMAGES - images.length)
    setImages((prev) => [...prev, ...files.slice(0, room)])
  }
  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    if (!form.validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setIsSaving(true)
    setSaveError('')
    let newId: number | undefined
    try {
      const res = await adminSpiritApi.create(form.buildPayload())
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
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-semibold">
                      대표
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="삭제"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-sm leading-none
                      flex items-center justify-center hover:bg-black/80 transition-colors"
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
          </div>
        }
      />

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
      )}

      {/* 하단 고정 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-neutral-200">
        <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-6 py-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/spirits')}>취소</Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>등록</Button>
        </div>
      </div>
    </div>
  )
}
