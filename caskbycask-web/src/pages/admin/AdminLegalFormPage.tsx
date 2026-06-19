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
import { getDefaultLegalHtml } from '@/domain/legal/defaultTemplates'
import HtmlEditorField from '@/shared/components/HtmlEditorField'
import Button from '@/shared/components/Button'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

const schema = z.object({
  type: z.enum(['TERMS', 'PRIVACY_POLICY', 'OPERATION_POLICY'] as const),
  version: z.string().min(1, '버전을 입력하세요').max(50, '버전은 50자 이하여야 합니다'),
  content: z.string().min(1, '내용을 입력하세요'),
})

type FormValues = z.infer<typeof schema>

const TYPE_OPTIONS: { value: LegalDocumentType; label: string }[] = [
  { value: 'TERMS', label: LEGAL_TYPE_LABELS.TERMS },
  { value: 'PRIVACY_POLICY', label: LEGAL_TYPE_LABELS.PRIVACY_POLICY },
  { value: 'OPERATION_POLICY', label: LEGAL_TYPE_LABELS.OPERATION_POLICY },
]

export default function AdminLegalFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { toasts, showToast, removeToast } = useToast()

  const isEdit = id != null
  const docId = isEdit ? Number(id) : null

  // 복사 모드: ?copyFrom=<id> 로 특정 버전 내용을 그대로 가져와 새 버전 작성을 시작.
  // (개정 시 활성 버전을 복사해 변경점만 수정하면 됨)
  const copyFromParam = searchParams.get('copyFrom')
  const copyFromId = !isEdit && copyFromParam ? Number(copyFromParam) : null

  // 수정이면 해당 문서, 새 등록+복사면 원본 문서를 조회
  const sourceId = isEdit ? docId : copyFromId
  const { data: existing, isLoading } = useAdminLegalDetail(sourceId)
  const createMutation = useCreateLegalDocument()
  const updateMutation = useUpdateLegalDocument()

  const defaultType = (searchParams.get('type') as LegalDocumentType) ?? 'TERMS'

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, version: '', content: '' },
  })

  // "기본 양식 불러오기" — 선택된 문서 종류의 표준 템플릿을 에디터에 채운다.
  // 작성 중인 내용이 있으면 덮어쓰기 전 확인.
  const handleLoadTemplate = () => {
    const current = getValues('content')?.replace(/<[^>]*>/g, '').trim()
    if (current && !window.confirm('작성 중인 내용을 기본 양식으로 덮어쓸까요?')) {
      return
    }
    setValue('content', getDefaultLegalHtml(watch('type')), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  useEffect(() => {
    if (existing) {
      reset({
        type: existing.type,
        // 복사 모드에서는 버전을 비워 새 버전명을 입력하도록 유도, 내용만 가져온다.
        version: isEdit ? existing.version : '',
        content: existing.content ?? existing.contentSanitized,
      })
    }
  }, [existing, reset, isEdit])

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

  if (sourceId != null && isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-neutral-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
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

      {!isEdit && copyFromId != null && existing && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <strong>{existing.version}</strong> 버전을 복사했습니다. 변경점을 수정한 뒤 새 버전명을 입력해 저장하세요.
        </div>
      )}

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
              placeholder="예: v1.0, 2026-01-01"
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              내용 <span className="text-danger-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleLoadTemplate}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md
                border border-primary-300 text-primary-800 bg-white hover:bg-primary-50 transition-colors"
              title="선택한 문서 종류의 표준 양식을 에디터에 채웁니다"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              기본 양식 불러오기
            </button>
          </div>
          <p className="mb-2 text-xs text-neutral-400">
            조 제목은 제목(H2), 항목은 번호/글머리 목록을 사용하세요. 공개 페이지와 동일한 서식으로 표시됩니다.
          </p>
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
