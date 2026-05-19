import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import { scoreColor } from '@/shared/utils/format'
import { useCreateReview, useUpdateReview } from '../hooks/useReviews'
import ReviewScoreSection from './ReviewScoreSection'
import { EMPTY_AROMA_NOTES, parseAromaNotes, serializeAromaNotes } from '../constants/whiskyAromas'
import type { AromaNotes } from '../constants/whiskyAromas'
import type { ReviewItem } from '../types/review.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

const reviewSchema = z.object({
  noseScore:   z.number().min(0, '0 이상이어야 합니다.').max(100, '100 이하여야 합니다.'),
  tasteScore:  z.number().min(0, '0 이상이어야 합니다.').max(100, '100 이하여야 합니다.'),
  finishScore: z.number().min(0, '0 이상이어야 합니다.').max(100, '100 이하여야 합니다.'),
  noseNote:    z.string().min(20, '최소 20글자 이상 작성해주세요.').max(200, '200자 이내로 작성해주세요.'),
  tasteNote:   z.string().min(20, '최소 20글자 이상 작성해주세요.').max(200, '200자 이내로 작성해주세요.'),
  finishNote:  z.string().min(20, '최소 20글자 이상 작성해주세요.').max(200, '200자 이내로 작성해주세요.'),
  comment:     z.string().max(500, '500자 이내로 작성해주세요.').optional(),
})

type ReviewFormValues = z.infer<typeof reviewSchema>

export interface ReviewFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  spiritId: number
  spiritCategory?: SpiritCategory
  editingReview?: ReviewItem
}

export default function ReviewFormModal({
  open,
  onClose,
  onSuccess,
  spiritId,
  spiritCategory,
  editingReview,
}: ReviewFormModalProps) {
  const { t } = useTranslation()
  const createMutation = useCreateReview(spiritId)
  const updateMutation = useUpdateReview(spiritId)

  const isWhisky = spiritCategory === 'WHISKY'

  const [noseAromas, setNoseAromas]     = useState<AromaNotes>(EMPTY_AROMA_NOTES)
  const [tasteAromas, setTasteAromas]   = useState<AromaNotes>(EMPTY_AROMA_NOTES)
  const [finishAromas, setFinishAromas] = useState<AromaNotes>(EMPTY_AROMA_NOTES)

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      noseScore:   editingReview?.noseScore   ?? 70,
      tasteScore:  editingReview?.tasteScore  ?? 70,
      finishScore: editingReview?.finishScore ?? 70,
      noseNote:    editingReview?.noseNote    ?? '',
      tasteNote:   editingReview?.tasteNote   ?? '',
      finishNote:  editingReview?.finishNote  ?? '',
      comment:     editingReview?.comment     ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        noseScore:   editingReview?.noseScore   ?? 70,
        tasteScore:  editingReview?.tasteScore  ?? 70,
        finishScore: editingReview?.finishScore ?? 70,
        noseNote:    editingReview?.noseNote    ?? '',
        tasteNote:   editingReview?.tasteNote   ?? '',
        finishNote:  editingReview?.finishNote  ?? '',
        comment:     editingReview?.comment     ?? '',
      })
      setNoseAromas(parseAromaNotes(editingReview?.noseAromaWheelNotes))
      setTasteAromas(parseAromaNotes(editingReview?.tasteAromaWheelNotes))
      setFinishAromas(parseAromaNotes(editingReview?.finishAromaWheelNotes))
    }
  }, [open, editingReview, reset])

  const [nose, taste, finish, commentValue, noseNote, tasteNote, finishNote] = watch([
    'noseScore', 'tasteScore', 'finishScore', 'comment',
    'noseNote', 'tasteNote', 'finishNote',
  ])
  const totalPreview = (nose + taste + finish) / 3

  const onSubmit = async (values: ReviewFormValues) => {
    const payload = {
      noseScore:             values.noseScore,
      tasteScore:            values.tasteScore,
      finishScore:           values.finishScore,
      noseNote:              values.noseNote.trim(),
      tasteNote:             values.tasteNote.trim(),
      finishNote:            values.finishNote.trim(),
      comment:               values.comment?.trim() || undefined,
      noseAromaWheelNotes:   isWhisky ? serializeAromaNotes(noseAromas)   : undefined,
      tasteAromaWheelNotes:  isWhisky ? serializeAromaNotes(tasteAromas)  : undefined,
      finishAromaWheelNotes: isWhisky ? serializeAromaNotes(finishAromas) : undefined,
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
      title={editingReview ? t('review.edit') : t('review.write')}
      size={isWhisky ? '2xl' : 'lg'}
      closeOnOverlay={!isPending}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── 향 ── */}
        <Controller
          name="noseScore"
          control={control}
          render={({ field }) => (
            <ReviewScoreSection
              label={t('review.nose')}
              score={field.value}
              onScoreChange={field.onChange}
              note={noseNote ?? ''}
              onNoteChange={(v) => setValue('noseNote', v, { shouldValidate: true })}
              notePlaceholder={t('review.nosePlaceholder')}
              scoreError={errors.noseScore?.message}
              noteError={errors.noseNote?.message}
              isWhisky={isWhisky}
              aromaNote={noseAromas}
              onAromaNoteChange={setNoseAromas}
            />
          )}
        />

        {/* ── 맛 ── */}
        <Controller
          name="tasteScore"
          control={control}
          render={({ field }) => (
            <ReviewScoreSection
              label={t('review.taste')}
              score={field.value}
              onScoreChange={field.onChange}
              note={tasteNote ?? ''}
              onNoteChange={(v) => setValue('tasteNote', v, { shouldValidate: true })}
              notePlaceholder={t('review.tastePlaceholder')}
              scoreError={errors.tasteScore?.message}
              noteError={errors.tasteNote?.message}
              isWhisky={isWhisky}
              aromaNote={tasteAromas}
              onAromaNoteChange={setTasteAromas}
            />
          )}
        />

        {/* ── 피니시 ── */}
        <Controller
          name="finishScore"
          control={control}
          render={({ field }) => (
            <ReviewScoreSection
              label={t('review.finish')}
              score={field.value}
              onScoreChange={field.onChange}
              note={finishNote ?? ''}
              onNoteChange={(v) => setValue('finishNote', v, { shouldValidate: true })}
              notePlaceholder={t('review.finishPlaceholder')}
              scoreError={errors.finishScore?.message}
              noteError={errors.finishNote?.message}
              isWhisky={isWhisky}
              aromaNote={finishAromas}
              onAromaNoteChange={setFinishAromas}
            />
          )}
        />

        {/* ── 총점 미리보기 + 총평: PC는 가로 배치 ── */}
        <div className="md:grid md:grid-cols-[200px_1fr] md:gap-4 md:items-start space-y-4 md:space-y-0">

          {/* 총점 미리보기 */}
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-100
            md:flex-col md:items-center md:justify-center md:gap-1 md:h-full">
            <div className="md:text-center">
              <p className="text-xs font-medium text-neutral-600">{t('review.totalPreview')}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{t('review.totalPreviewHint')}</p>
            </div>
            <span
              className="text-3xl font-bold tabular-nums md:text-4xl"
              style={{ color: scoreColor(totalPreview) }}
            >
              {totalPreview.toFixed(1)}
            </span>
          </div>

          {/* 총평 */}
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  {t('review.overall')}{' '}
                  <span className="text-neutral-400 font-normal text-xs">({t('review.overallHint')})</span>
                </label>
                <textarea
                  {...field}
                  rows={4}
                  maxLength={500}
                  placeholder={t('review.overallPlaceholder')}
                  className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-xl resize-none
                    focus:outline-none focus:ring-2 focus:ring-primary-400
                    placeholder:text-neutral-400 min-h-[5rem]"
                />
                <div className="flex items-start justify-between mt-1">
                  <p className="text-xs text-red-500 min-h-[1rem]">{errors.comment?.message ?? ''}</p>
                  <p className="text-xs text-neutral-400 tabular-nums flex-shrink-0 ml-2">
                    {commentValue?.length ?? 0}/500
                  </p>
                </div>
              </div>
            )}
          />
        </div>

        {serverError && (
          <p className="text-sm text-red-600">{t('review.saveError')}</p>
        )}

        {/* ── 경고 문구 ── */}
        <p className="text-[11px] text-neutral-400 text-center leading-relaxed px-2">
          {t('review.qualityWarning')}
        </p>

        <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" type="submit" isLoading={isPending}>
            {editingReview ? t('review.submitEdit') : t('review.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
