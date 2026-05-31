import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminFaqDetail, useCreateFaq, useUpdateFaq } from '@/domain/faq/hooks/useFaq'
import type { FaqLanguage, FaqCategory } from '@/domain/faq/types/faq.types'
import Button from '@/shared/components/Button'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

const CATEGORY_OPTIONS: { value: FaqCategory; labelKo: string; labelEn: string }[] = [
  { value: 'SERVICE', labelKo: 'DrinkIndex 이용 안내', labelEn: 'About DrinkIndex' },
  { value: 'WHISKY',  labelKo: '위스키',               labelEn: 'Whisky' },
  { value: 'COGNAC',  labelKo: '꼬냑',                 labelEn: 'Cognac' },
  { value: 'WINE',    labelKo: '와인',                  labelEn: 'Wine' },
]

interface FormState {
  language: FaqLanguage
  category: FaqCategory
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
}

const INIT: FormState = {
  language: 'KO',
  category: 'SERVICE',
  question: '',
  answer: '',
  sortOrder: 0,
  isActive: true,
}

export default function AdminFaqFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const [form, setForm] = useState<FormState>(INIT)

  const { data: detail } = useAdminFaqDetail(isEdit ? Number(id) : 0)
  const createMutation = useCreateFaq()
  const updateMutation = useUpdateFaq()

  useEffect(() => {
    if (detail) {
      setForm({
        language: detail.language,
        category: detail.category,
        question: detail.question,
        answer: detail.answer,
        sortOrder: detail.sortOrder,
        isActive: detail.isActive,
      })
    }
  }, [detail])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.question.trim()) { showToast('질문을 입력해주세요.', 'error'); return }
    if (!form.answer.trim())   { showToast('답변을 입력해주세요.', 'error'); return }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: Number(id),
          data: {
            category: form.category,
            question: form.question,
            answer: form.answer,
            sortOrder: form.sortOrder,
            isActive: form.isActive,
          },
        })
        showToast('수정되었습니다.', 'success')
      } else {
        await createMutation.mutateAsync(form)
        showToast('등록되었습니다.', 'success')
      }
      navigate('/admin/faq')
    } catch {
      showToast('저장에 실패했습니다.', 'error')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const categoryOptions = CATEGORY_OPTIONS.map((opt) => ({
    value: opt.value,
    label: form.language === 'EN' ? opt.labelEn : opt.labelKo,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <Toast toasts={toasts} onRemove={removeToast} />

      <AdminPageHeader
        breadcrumbs={[
          { label: 'FAQ 관리', to: '/admin/faq' },
          { label: isEdit ? 'FAQ 수정' : 'FAQ 등록' },
        ]}
        backTo="/admin/faq"
        backLabel="FAQ 목록"
        title={isEdit ? 'FAQ 수정' : 'FAQ 등록'}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 언어 (신규만) */}
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">언어</label>
            <div className="flex gap-3">
              {(['KO', 'EN'] as FaqLanguage[]).map((lang) => (
                <label key={lang} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="language"
                    value={lang}
                    checked={form.language === lang}
                    onChange={() => set('language', lang)}
                    className="accent-primary-800"
                  />
                  <span className="text-sm text-neutral-700">
                    {lang === 'KO' ? '국문 (KO)' : '영문 (EN)'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">카테고리</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value as FaqCategory)}
            className="w-full h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 질문 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            질문 <span className="text-neutral-400 font-normal">(최대 500자)</span>
          </label>
          <input
            type="text"
            value={form.question}
            onChange={(e) => set('question', e.target.value)}
            maxLength={500}
            placeholder="질문을 입력하세요"
            className="w-full h-9 px-3 text-sm border border-neutral-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <p className="text-xs text-neutral-400 mt-1 text-right">{form.question.length} / 500</p>
        </div>

        {/* 답변 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">답변</label>
          <textarea
            value={form.answer}
            onChange={(e) => set('answer', e.target.value)}
            rows={6}
            placeholder="답변을 입력하세요"
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {/* 순서 + 노출 */}
        <div className="flex gap-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              정렬 순서 <span className="text-neutral-400 font-normal">(숫자가 작을수록 위)</span>
            </label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', Number(e.target.value))}
              min={0}
              className="w-32 h-9 px-3 text-sm border border-neutral-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">노출 여부</label>
            <label className="flex items-center gap-2 cursor-pointer h-9">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="w-4 h-4 accent-primary-800"
              />
              <span className="text-sm text-neutral-700">공개</span>
            </label>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" isLoading={isPending}>
            {isEdit ? '수정' : '등록'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/faq')}>
            취소
          </Button>
        </div>
      </form>
    </div>
  )
}
