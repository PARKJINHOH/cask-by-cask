import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import ScoreInput from '@/shared/components/ScoreInput'
import { scoreColor } from '@/shared/utils/format'
import { useCreateReview, useUpdateReview } from '../hooks/useReviews'
import type { ReviewItem } from '../types/review.types'

const reviewSchema = z.object({
  noseScore: z.number().int().min(0, '0 이상이어야 합니다.').max(100, '100 이하여야 합니다.'),
  tasteScore: z.number().int().min(0, '0 이상이어야 합니다.').max(100, '100 이하여야 합니다.'),
  finishScore: z.number().int().min(0, '0 이상이어야 합니다.').max(100, '100 이하여야 합니다.'),
  comment: z.string().max(500, '500자 이내로 작성해주세요.').optional(),
})

type ReviewFormValues = z.infer<typeof reviewSchema>

export interface ReviewFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  spiritId: number
  editingReview?: ReviewItem
}

export default function ReviewFormModal({
  open,
  onClose,
  onSuccess,
  spiritId,
  editingReview,
}: ReviewFormModalProps) {
  const createMutation = useCreateReview(spiritId)
  const updateMutation = useUpdateReview(spiritId)

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      noseScore: editingReview?.noseScore ?? 70,
      tasteScore: editingReview?.tasteScore ?? 70,
      finishScore: editingReview?.finishScore ?? 70,
      comment: editingReview?.comment ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        noseScore: editingReview?.noseScore ?? 70,
        tasteScore: editingReview?.tasteScore ?? 70,
        finishScore: editingReview?.finishScore ?? 70,
        comment: editingReview?.comment ?? '',
      })
    }
  }, [open, editingReview, reset])

  const [nose, taste, finish, commentValue] = watch([
    'noseScore',
    'tasteScore',
    'finishScore',
    'comment',
  ])
  const totalPreview = (nose + taste + finish) / 3

  const onSubmit = async (values: ReviewFormValues) => {
    const payload = {
      noseScore: values.noseScore,
      tasteScore: values.tasteScore,
      finishScore: values.finishScore,
      comment: values.comment?.trim() || undefined,
    }
    if (editingReview) {
      await updateMutation.mutateAsync({ reviewId: editingReview.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onSuccess?.()
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending || isSubmitting
  const serverError = createMutation.error || updateMutation.error

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingReview ? '리뷰 수정' : '리뷰 작성'}
      size="md"
      closeOnOverlay={!isPending}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Score inputs */}
        <div className="space-y-5">
          <Controller
            name="noseScore"
            control={control}
            render={({ field }) => (
              <div>
                <ScoreInput label="향 (Nose)" value={field.value} onChange={field.onChange} />
                {errors.noseScore && (
                  <p className="mt-1 text-xs text-red-500">{errors.noseScore.message}</p>
                )}
              </div>
            )}
          />
          <Controller
            name="tasteScore"
            control={control}
            render={({ field }) => (
              <div>
                <ScoreInput label="맛 (Taste)" value={field.value} onChange={field.onChange} />
                {errors.tasteScore && (
                  <p className="mt-1 text-xs text-red-500">{errors.tasteScore.message}</p>
                )}
              </div>
            )}
          />
          <Controller
            name="finishScore"
            control={control}
            render={({ field }) => (
              <div>
                <ScoreInput label="피니시 (Finish)" value={field.value} onChange={field.onChange} />
                {errors.finishScore && (
                  <p className="mt-1 text-xs text-red-500">{errors.finishScore.message}</p>
                )}
              </div>
            )}
          />
        </div>

        {/* Total score preview */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100">
          <div>
            <p className="text-xs font-medium text-neutral-600">총점 미리보기</p>
            <p className="text-xs text-neutral-400 mt-0.5">향 + 맛 + 피니시 평균</p>
          </div>
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: scoreColor(totalPreview) }}
          >
            {totalPreview.toFixed(1)}
          </span>
        </div>

        {/* Comment */}
        <Controller
          name="comment"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                기타 코멘트{' '}
                <span className="text-neutral-400 font-normal text-xs">(선택, 점수 없는 텍스트 코멘트)</span>
              </label>
              <textarea
                {...field}
                rows={4}
                maxLength={500}
                placeholder="이 술에 대한 생각을 자유롭게 남겨주세요..."
                className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg resize-none
                  focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
                  placeholder:text-neutral-400"
              />
              <div className="flex items-start justify-between mt-1">
                <p className="text-xs text-red-500 min-h-[1rem]">
                  {errors.comment?.message ?? ''}
                </p>
                <p className="text-xs text-neutral-400 tabular-nums flex-shrink-0 ml-2">
                  {commentValue?.length ?? 0}/500
                </p>
              </div>
            </div>
          )}
        />

        {serverError && (
          <p className="text-sm text-red-600">저장 중 오류가 발생했습니다. 다시 시도해주세요.</p>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button size="sm" type="submit" isLoading={isPending}>
            {editingReview ? '수정 완료' : '리뷰 등록'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
