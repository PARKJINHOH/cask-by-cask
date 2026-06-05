import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminSpiritApi } from '@/domain/admin/api/adminSpiritApi'
import Button from '@/shared/components/Button'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import SpiritFormFields, { useSpiritForm } from '@/domain/admin/components/SpiritFormFields'

// ── 새 술 등록 (관리자 직접 등록) ───────────────────────────────────
// 폼 필드·검증·페이로드는 SpiritFormFields(단일 소스)에서 정의.
// 수정은 주류 상세(AdminSpiritDetailPage)에서 처리한다.

export default function AdminSpiritFormPage() {
  const navigate = useNavigate()
  const form = useSpiritForm()

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSubmit = async () => {
    if (!form.validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setIsSaving(true)
    setSaveError('')
    try {
      const res = await adminSpiritApi.create(form.buildPayload())
      navigate(`/admin/spirits/${res.data.data?.id ?? ''}`)
    } catch {
      setSaveError('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 mx-auto space-y-6 pb-28 max-w-3xl lg:max-w-6xl">
      <AdminPageHeader
        breadcrumbs={[
          { label: '주류 관리', to: '/admin/spirits' },
          { label: '주류 등록' },
        ]}
        backTo="/admin/spirits"
        backLabel="주류 목록"
        title="새 술 등록"
      />

      <SpiritFormFields form={form} />

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
      )}

      {/* 하단 고정 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-neutral-200">
        <div className="max-w-3xl lg:max-w-6xl mx-auto px-6 py-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/spirits')}>취소</Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>등록</Button>
        </div>
      </div>
    </div>
  )
}
