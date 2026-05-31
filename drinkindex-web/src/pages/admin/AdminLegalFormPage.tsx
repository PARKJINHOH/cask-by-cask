import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  useAdminLegalDetail,
  useCreateLegalDocument,
  useUpdateLegalDocument,
} from '@/domain/legal/hooks/useAdminLegal'
import { LEGAL_TYPE_LABELS } from '@/domain/legal/types/legal.types'
import type { LegalDocumentType } from '@/domain/legal/types/legal.types'
import HtmlEditorField from '@/shared/components/HtmlEditorField'
import Button from '@/shared/components/Button'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

const schema = z.object({
  type: z.enum(['TERMS', 'PRIVACY_POLICY'] as const),
  version: z.string().min(1, '버전을 입력하세요').max(50, '버전은 50자 이하여야 합니다'),
  content: z.string().min(1, '내용을 입력하세요'),
})

type FormValues = z.infer<typeof schema>

const TYPE_OPTIONS: { value: LegalDocumentType; label: string }[] = [
  { value: 'TERMS', label: LEGAL_TYPE_LABELS.TERMS },
  { value: 'PRIVACY_POLICY', label: LEGAL_TYPE_LABELS.PRIVACY_POLICY },
]

export default function AdminLegalFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { toasts, showToast, removeToast } = useToast()

  const isEdit = id != null
  const docId = isEdit ? Number(id) : null

  const { data: existing, isLoading } = useAdminLegalDetail(docId)
  const createMutation = useCreateLegalDocument()
  const updateMutation = useUpdateLegalDocument()

  const defaultType = (searchParams.get('type') as LegalDocumentType) ?? 'TERMS'

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, version: '', content: '' },
  })

  useEffect(() => {
    if (existing) {
      reset({
        type: existing.type,
        version: existing.version,
        content: existing.content ?? existing.contentSanitized,
      })
    }
  }, [existing, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && docId != null) {
        await updateMutation.mutateAsync({ id: docId, data: { version: values.version, content: values.content } })
        showToast('수정되었습니다.', 'success')
      } else {
        await createMutation.mutateAsync(values)
        showToast('새 버전이 등록되었습니다. 목록에서 활성화해주세요.', 'success')
      }
      setTimeout(() => navigate('/admin/legal'), 900)
    } catch {
      showToast('저장 중 오류가 발생했습니다.', 'error')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-neutral-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <AdminPageHeader
        breadcrumbs={[
          { label: '약관 관리', to: '/admin/legal' },
          { label: isEdit ? '버전 수정' : '새 버전 등록' },
        ]}
        backTo="/admin/legal"
        backLabel="약관 목록"
        title={isEdit ? '버전 수정' : '새 버전 등록'}
        badge={isEdit && existing && (
          <span className={[
            'text-xs px-2 py-0.5 rounded-full font-medium',
            existing.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-neutral-100 text-neutral-500',
          ].join(' ')}>
            {existing.isActive ? '활성' : '비활성'}
          </span>
        )}
      />

      {!isEdit && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          저장 후 목록에서 <strong>활성화</strong>해야 사용자에게 노출됩니다.
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* 문서 타입 + 버전 */}
        <div className="flex gap-4">
          <div className="w-48">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              문서 종류 <span className="text-danger-500">*</span>
            </label>
            <select
              {...register('type')}
              disabled={isEdit}
              className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white
                disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              버전 <span className="text-danger-500">*</span>
            </label>
            <input
              {...register('version')}
              placeholder="예: v1.0, 2025-01-01"
              maxLength={50}
              className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            {errors.version && (
              <p className="mt-1 text-xs text-danger-600">{errors.version.message}</p>
            )}
          </div>
        </div>

        {/* 내용 에디터 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            내용 <span className="text-danger-500">*</span>
          </label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <HtmlEditorField
                value={field.value}
                onChange={field.onChange}
                placeholder="<h2>제1조 (목적)</h2><p>내용을 입력하세요...</p>"
              />
            )}
          />
          {errors.content && (
            <p className="mt-1 text-xs text-danger-600">{errors.content.message}</p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
          <Button variant="secondary" onClick={() => navigate('/admin/legal')} disabled={isPending}>
            취소
          </Button>
          <div className="flex-1" />
          <Button variant="primary" isLoading={isPending} onClick={handleSubmit(onSubmit)}>
            {isEdit ? '수정 저장' : '저장 (비활성 상태로)'}
          </Button>
        </div>
      </form>
    </div>
  )
}
