import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useAdminNoticeDetail,
  useCreateNotice,
  useUpdateNotice,
} from '@/domain/notice/hooks/useAdminNotices'
import { NOTICE_CATEGORY_LABELS } from '@/domain/notice/types/notice.types'
import type { NoticeCategory } from '@/domain/notice/types/notice.types'
import HtmlEditorField from '@/shared/components/HtmlEditorField'
import Button from '@/shared/components/Button'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'
import { draftApi } from '@/shared/api/draftApi'
import DraftSavedNotice from '@/shared/components/DraftSavedNotice'
import DraftListModal from '@/shared/components/DraftListModal'


const schema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(300, '제목은 300자 이하여야 합니다'),
  content: z.string().min(1, '내용을 입력하세요'),
  category: z.enum(['GENERAL', 'UPDATE', 'EVENT', 'MAINTENANCE', 'NOTICE'] as const),
  isPinned: z.boolean(),
  publishMode: z.enum(['DRAFT', 'NOW', 'SCHEDULED'] as const),
  publishedAt: z.string(),
}).superRefine((values, ctx) => {
  if (values.publishMode !== 'SCHEDULED') return
  if (!values.publishedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['publishedAt'], message: '예약 발행일시를 입력하세요' })
    return
  }
  if (new Date(values.publishedAt).getTime() <= Date.now()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['publishedAt'], message: '현재 이후의 일시를 입력하세요' })
  }
})

type FormValues = z.infer<typeof schema>

export default function AdminNoticeFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = id != null
  const noticeId = isEdit ? Number(id) : null
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const { data: existing, isLoading } = useAdminNoticeDetail(noticeId)
  const createMutation = useCreateNotice()
  const updateMutation = useUpdateNotice()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      category: 'GENERAL',
      isPinned: false,
      publishMode: 'DRAFT',
      publishedAt: '',
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        content: existing.content,
        category: existing.category,
        isPinned: existing.isPinned,
        publishMode: existing.isPublished
          ? (existing.publishedAt && new Date(existing.publishedAt).getTime() > Date.now() ? 'SCHEDULED' : 'NOW')
          : 'DRAFT',
        publishedAt: existing.publishedAt?.slice(0, 16) ?? '',
      })
    }
  }, [existing, reset])

  // ── 임시저장 (신규 작성 시에만) ──
  const DRAFT_KEY = 'ADMIN_NOTICE'
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>(undefined)
  const [draftListOpen, setDraftListOpen] = useState(false)

  const saveDraft = async () => {
    const v = getValues()
    if (!v.title.trim() && !v.content.replace(/<[^>]*>/g, '').trim()) {
      showToast('임시저장할 내용이 없습니다.', 'error')
      return
    }
    setIsSavingDraft(true)
    try {
      const res = await draftApi.save({
        id: currentDraftId,
        draftKey: DRAFT_KEY,
        title: v.title,
        content: v.content,
        meta: JSON.stringify({
          category: v.category,
          isPinned: v.isPinned,
          publishMode: v.publishMode,
          publishedAt: v.publishedAt,
        }),
      })
      const saved = res.data.data
      if (saved?.id) setCurrentDraftId(saved.id)
      setLastSavedAt(saved?.updatedAt ?? new Date().toISOString())
      showToast('임시저장되었습니다.', 'success')
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      showToast(code === 'DRAFT_003' ? (msg ?? '임시저장 개수가 가득 찼습니다.') : '임시저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setIsSavingDraft(false)
    }
  }

  // 목록에서 임시저장 불러오기
  const loadDraft = (d: { id: number; title: string | null; content: string | null; meta: string | null }) => {
    let category: NoticeCategory = 'GENERAL'
    let isPinned = false
    let publishMode: FormValues['publishMode'] = 'DRAFT'
    let publishedAt = ''
    if (d.meta) {
      try {
        const m = JSON.parse(d.meta) as {
          category?: NoticeCategory
          isPinned?: boolean
          publishMode?: FormValues['publishMode']
          publishedAt?: string
        }
        if (m.category) category = m.category
        if (typeof m.isPinned === 'boolean') isPinned = m.isPinned
        if (m.publishMode) publishMode = m.publishMode
        if (m.publishedAt) publishedAt = m.publishedAt
      } catch { /* meta 파싱 실패 무시 */ }
    }
    setCurrentDraftId(d.id)
    reset({
      title: d.title ?? '',
      content: d.content ?? '',
      category,
      isPinned,
      publishMode,
      publishedAt,
    })
    showToast('임시저장을 불러왔습니다.', 'success')
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        title: values.title,
        content: values.content,
        category: values.category,
        isPinned: values.isPinned,
        isPublished: values.publishMode !== 'DRAFT',
        publishedAt: values.publishMode === 'SCHEDULED' ? values.publishedAt : null,
      }
      if (isEdit && noticeId != null) {
        await updateMutation.mutateAsync({
          id: noticeId,
          data: payload,
        })
        showToast('공지사항이 저장되었습니다.', 'success')
      } else {
        await createMutation.mutateAsync(payload)
        showToast('공지사항이 저장되었습니다.', 'success')
        // 등록 완료 → 불러온/저장된 임시저장 삭제
        if (currentDraftId) draftApi.remove(currentDraftId).catch(() => { /* 무시 */ })
      }
      setTimeout(() => navigate('/admin/notices'), 800)
    } catch {
      showToast('저장 중 오류가 발생했습니다.', 'error')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const publishMode = watch('publishMode')

  if (isEdit && isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-neutral-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Toast toasts={toasts} onRemove={removeToast} />
      <DraftListModal
        open={draftListOpen}
        draftKey={DRAFT_KEY}
        onClose={() => setDraftListOpen(false)}
        onLoad={loadDraft}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* 헤더 */}
      <AdminPageHeader
        breadcrumbs={[
          { label: '공지사항', to: '/admin/notices' },
          { label: isEdit ? '공지 수정' : '공지 작성' },
        ]}
        backTo="/admin/notices"
        backLabel="공지 목록"
        title={isEdit ? '공지 수정' : '공지 작성'}
      />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6"
      >
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            제목 <span className="text-danger-500">*</span>
          </label>
          <input
            {...register('title')}
            placeholder="공지 제목을 입력하세요"
            maxLength={300}
            className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none
              disabled:bg-neutral-50"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-danger-600">{errors.title.message}</p>
          )}
        </div>

        {/* 카테고리 + 고정 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">카테고리</label>
            <select
              {...register('category')}
              className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {(Object.entries(NOTICE_CATEGORY_LABELS) as [NoticeCategory, string][]).map(
                ([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ),
              )}
            </select>
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Controller
                name="isPinned"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="w-4 h-4 accent-primary-800 rounded"
                  />
                )}
              />
              <span className="text-sm text-neutral-700">상단 고정</span>
            </label>
          </div>
        </div>

        {/* 에디터 */}
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
                onImageUploadError={(msg) => showToast(msg, 'error')}
                placeholder="공지 내용을 입력하세요..."
              />
            )}
          />
          {errors.content && (
            <p className="mt-1 text-xs text-danger-600">{errors.content.message}</p>
          )}
          {/* 임시저장 (신규 작성 시) */}
          {!isEdit && (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSavingDraft}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                  border border-neutral-300 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                {isSavingDraft ? '저장 중...' : '임시저장'}
              </button>
              <button
                type="button"
                onClick={() => setDraftListOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                  border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                임시저장목록
              </button>
              <DraftSavedNotice savedAt={lastSavedAt} />
            </div>
          )}
        </div>

        {/* 발행 설정 */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-700">발행 설정</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {([
              ['DRAFT', '미발행', '저장만 하고 노출하지 않습니다.'],
              ['NOW', '즉시 발행', '저장 즉시 사용자에게 공개합니다.'],
              ['SCHEDULED', '예약 발행', '지정한 날짜와 시간에 공개합니다.'],
            ] as const).map(([value, label, description]) => (
              <label key={value} className={`cursor-pointer rounded-lg border p-3 ${publishMode === value ? 'border-primary-500 bg-white ring-1 ring-primary-200' : 'border-neutral-200 bg-white'}`}>
                <input type="radio" value={value} {...register('publishMode')} className="mr-2 accent-primary-800" />
                <span className="text-sm font-semibold text-neutral-700">{label}</span>
                <p className="mt-1 text-xs text-neutral-400">{description}</p>
              </label>
            ))}
          </div>
          {publishMode === 'SCHEDULED' && (
            <div className="mt-3 max-w-sm">
              <label className="mb-1 block text-xs font-medium text-neutral-600">예약 발행일시 (년·월·일·시·분)</label>
              <input type="datetime-local" step="60" min={toLocalInputValue(new Date())} max="9999-12-31T23:59"
                {...register('publishedAt')}
                className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
              {errors.publishedAt && <p className="mt-1 text-xs text-danger-600">{errors.publishedAt.message}</p>}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/notices')}
            disabled={isPending}
          >
            취소
          </Button>
          <div className="flex-1" />
          <Button
            variant="primary"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            저장
          </Button>
        </div>
      </form>
    </div>
  )
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
