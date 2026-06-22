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
  isPublished: z.boolean(),
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
      isPublished: false,
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        content: existing.content,
        category: existing.category,
        isPinned: existing.isPinned,
        isPublished: existing.isPublished,
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
        meta: JSON.stringify({ category: v.category, isPinned: v.isPinned }),
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
    if (d.meta) {
      try {
        const m = JSON.parse(d.meta) as { category?: NoticeCategory; isPinned?: boolean }
        if (m.category) category = m.category
        if (typeof m.isPinned === 'boolean') isPinned = m.isPinned
      } catch { /* meta 파싱 실패 무시 */ }
    }
    setCurrentDraftId(d.id)
    reset({
      title: d.title ?? '',
      content: d.content ?? '',
      category,
      isPinned,
      isPublished: false,
    })
    showToast('임시저장을 불러왔습니다.', 'success')
  }

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && noticeId != null) {
        await updateMutation.mutateAsync({
          id: noticeId,
          data: values,
        })
        showToast('공지사항이 저장되었습니다.', 'success')
      } else {
        await createMutation.mutateAsync(values)
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
  const isPublished = watch('isPublished')

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

        {/* 노출 설정 */}
        <Controller
          name="isPublished"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-neutral-700">공지 노출</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isPublished ? '사용자에게 공지가 공개됩니다.' : '저장만 되고 사용자에게 노출되지 않습니다.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={[
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                  'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  field.value ? 'bg-primary-800' : 'bg-neutral-300',
                ].join(' ')}
              >
                <span
                  className={[
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
                    field.value ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </div>
          )}
        />

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
