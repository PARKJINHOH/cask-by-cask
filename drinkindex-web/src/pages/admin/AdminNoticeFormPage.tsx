import { useEffect } from 'react'
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
import NoticeEditor from '@/domain/notice/components/NoticeEditor'
import Button from '@/shared/components/Button'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

const schema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(300, '제목은 300자 이하여야 합니다'),
  content: z.string().min(1, '내용을 입력하세요'),
  category: z.enum(['GENERAL', 'UPDATE', 'EVENT', 'MAINTENANCE'] as const),
  isPinned: z.boolean(),
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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      category: 'GENERAL',
      isPinned: false,
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        content: existing.content,
        category: existing.category,
        isPinned: existing.isPinned,
      })
    }
  }, [existing, reset])

  const onSubmit = async (values: FormValues, isPublished: boolean) => {
    try {
      if (isEdit && noticeId != null) {
        await updateMutation.mutateAsync({
          id: noticeId,
          data: { ...values, isPublished },
        })
        showToast('공지사항이 수정되었습니다.', 'success')
      } else {
        await createMutation.mutateAsync({ ...values, isPublished })
        showToast('공지사항이 저장되었습니다.', 'success')
      }
      setTimeout(() => navigate('/admin/notices'), 800)
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
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => navigate('/admin/notices')}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="목록으로"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-neutral-900">
          {isEdit ? '공지 수정' : '공지 작성'}
        </h1>
      </div>

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
                    className="w-4 h-4 accent-primary-600 rounded"
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
              <NoticeEditor
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
            variant="secondary"
            isLoading={isPending}
            onClick={handleSubmit((v) => onSubmit(v, false))}
          >
            임시저장
          </Button>
          <Button
            variant="primary"
            isLoading={isPending}
            onClick={handleSubmit((v) => onSubmit(v, true))}
          >
            발행
          </Button>
        </div>
      </form>
    </div>
  )
}
