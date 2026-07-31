import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import { scoreColor } from '@/shared/utils/format'
import { useCreateReview, useCreateVariantReviewRequest, useUpdateReview } from '../hooks/useReviews'
import ReviewScoreSection from './ReviewScoreSection'
import { getReviewSaveErrorMessage } from '../utils/reviewErrors'
import { EMPTY_AROMA_NOTES, parseAromaNotes, serializeAromaNotes } from '../utils/aroma'
import type { AromaNotes } from '../utils/aroma'
import type { ReviewItem } from '../types/review.types'
import { reviewApi } from '../api/reviewApi'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import { useSpiritDetail, useSpiritVariants } from '@/domain/spirit/hooks/useSpiritDetail'
import ReviewVariantCreateModal, { type ReviewVariantDraft } from './ReviewVariantCreateModal'
import ReviewVariantDraftCard from './ReviewVariantDraftCard'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import SocialPublishFields from '@/domain/social/components/SocialPublishFields'
import { socialApi } from '@/domain/social/api/socialApi'
import { EMPTY_SOCIAL_SELECTION, type SocialPublishSelection } from '@/domain/social/types/social.types'
import ReviewImageField, {
  existingReviewImageDrafts,
  reviewImageSubmission,
  type ReviewImageDraft,
} from './ReviewImageField'

const ADD_VARIANT_SELECT_VALUE = '__ADD_VARIANT__'

function getAromaWheelKey(category?: SpiritCategory): string {
  if (category === 'WHISKY') return 'review.aromaWheelWhisky'
  if (category === 'WINE')   return 'review.aromaWheelWine'
  if (category === 'COGNAC') return 'review.aromaWheelCognac'
  return 'review.aromaWheel'
}

const reviewSchema = z.object({
  noseScore:   z.number().min(0, '0 이상이어야 합니다.').max(100, '100 이하여야 합니다.'),
  tasteScore:  z.number().min(0, '0 이상이어야 합니다.').max(100, '100 이하여야 합니다.'),
  finishScore: z.number().min(0, '0 이상이어야 합니다.').max(100, '100 이하여야 합니다.'),
  noseNote:    z.string().min(20, '최소 20글자 이상 작성해주세요.').max(1000, '1000자 이내로 작성해주세요.'),
  tasteNote:   z.string().min(20, '최소 20글자 이상 작성해주세요.').max(1000, '1000자 이내로 작성해주세요.'),
  finishNote:  z.string().min(20, '최소 20글자 이상 작성해주세요.').max(1000, '1000자 이내로 작성해주세요.'),
  comment:     z.string().max(1000, '1000자 이내로 작성해주세요.').optional(),
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

  const { data: spirit } = useSpiritDetail(spiritId)
  const hasSubEditionFlow = !!spirit && (
    !!spirit.parentId ||
    !!spirit.seriesIdentifier ||
    !!(spirit.variantType && spirit.variantType !== 'NONE') ||
    (spirit.variants?.length ?? 0) > 0
  )
  const masterId = spirit?.parentId || (hasSubEditionFlow ? spirit.id : null)
  const { data: variants = [] } = useSpiritVariants(masterId || 0)

  const [targetSpiritId, setTargetSpiritId] = useState<number | null>(null)
  const [variantError, setVariantError] = useState<string | null>(null)
  const [variantCreateOpen, setVariantCreateOpen] = useState(false)
  const [pendingVariantDraft, setPendingVariantDraft] = useState<ReviewVariantDraft | null>(null)
  const [socialSelection, setSocialSelection] = useState<SocialPublishSelection>(EMPTY_SOCIAL_SELECTION)
  const [socialRetryIds, setSocialRetryIds] = useState<number[]>([])
  const [socialError, setSocialError] = useState('')
  const [reviewImages, setReviewImages] = useState<ReviewImageDraft[]>(
    existingReviewImageDrafts(editingReview?.images),
  )
  const editionSelectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (spirit) {
      if (hasSubEditionFlow) {
        setTargetSpiritId(null)
      } else if (!spirit.variants || spirit.variants.length === 0) {
        setTargetSpiritId(spirit.id)
      }
    }
  }, [spirit, hasSubEditionFlow])

  const createMutation = useCreateReview(targetSpiritId || spiritId)
  const createVariantReviewRequest = useCreateVariantReviewRequest(masterId || spiritId)
  const updateMutation = useUpdateReview(spiritId)

  const showAroma = spiritCategory === 'WHISKY' || spiritCategory === 'WINE' || spiritCategory === 'COGNAC'
  const aromaWheelTitle  = t(getAromaWheelKey(spiritCategory))

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
      setPendingVariantDraft(null)
      setSocialSelection(EMPTY_SOCIAL_SELECTION)
      setSocialRetryIds([])
      setSocialError('')
      setReviewImages(existingReviewImageDrafts(editingReview?.images))
    }
  }, [open, editingReview, reset])

  const [nose, taste, finish, commentValue, noseNote, tasteNote, finishNote] = watch([
    'noseScore', 'tasteScore', 'finishScore', 'comment',
    'noseNote', 'tasteNote', 'finishNote',
  ])
  const totalPreview = (nose + taste + finish) / 3

  const onSubmit = async (values: ReviewFormValues) => {
    if ((socialSelection.instagram || socialSelection.threads)
      && !socialSelection.consentAccepted) {
      setSocialError(t('social.consentRequired'))
      return
    }
    setSocialError('')
    if (masterId && hasSubEditionFlow && !editingReview && targetSpiritId === null && !pendingVariantDraft) {
      setVariantError(t('review.selectEditionRequired'))
      setTimeout(() => {
        editionSelectRef.current?.focus()
      }, 0)
      return
    }

    const payload = {
      noseScore:             values.noseScore,
      tasteScore:            values.tasteScore,
      finishScore:           values.finishScore,
      noseNote:              values.noseNote.trim(),
      tasteNote:             values.tasteNote.trim(),
      finishNote:            values.finishNote.trim(),
      comment:               values.comment?.trim() || undefined,
      noseAromaWheelNotes:   showAroma ? serializeAromaNotes(noseAromas)   : undefined,
      tasteAromaWheelNotes:  showAroma ? serializeAromaNotes(tasteAromas)  : undefined,
      finishAromaWheelNotes: showAroma ? serializeAromaNotes(finishAromas) : undefined,
      ...(!editingReview ? { socialPublish: socialSelection } : {}),
    }
    const imageSubmission = reviewImageSubmission(reviewImages)
    if (editingReview) {
      await updateMutation.mutateAsync({
        reviewId: editingReview.id,
        data: payload,
        imagePlan: imageSubmission.imagePlan,
        images: imageSubmission.files,
      })
      try {
        if (socialSelection.instagram || socialSelection.threads) {
          await reviewApi.requestInitialSocialPublications(
            spiritId,
            editingReview.id,
            socialSelection,
          )
        }
        await Promise.all(socialRetryIds.map((publicationId) => socialApi.retry(publicationId)))
      } catch {
        setSocialError(t('social.initialPublishError'))
        return
      }
    } else if (pendingVariantDraft && masterId) {
      await createVariantReviewRequest.mutateAsync({
        data: {
          ...payload,
          variantValue: pendingVariantDraft.variantValue,
          variantValueEn: pendingVariantDraft.variantValueEn,
          abv: pendingVariantDraft.abv,
          volumeMl: pendingVariantDraft.volumeMl,
          requestMemo: pendingVariantDraft.requestMemo,
        },
        images: imageSubmission.files,
      })
    } else {
      await createMutation.mutateAsync({ data: payload, images: imageSubmission.files })
    }
    onSuccess?.()
    onClose()
  }

  const isPending =
    createMutation.isPending ||
    createVariantReviewRequest.isPending ||
    updateMutation.isPending ||
    isSubmitting
  const serverError = createMutation.error || createVariantReviewRequest.error || updateMutation.error
  const serverErrorMessage = serverError
    ? getReviewSaveErrorMessage(serverError, t('review.saveError'))
    : ''
  const canAddVariant = !!masterId && hasSubEditionFlow && !editingReview

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingReview ? t('review.edit') : t('review.write')}
      size={showAroma ? '2xl' : 'lg'}
      closeOnOverlay={!isPending}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <RequiredFieldsNotice />

        {/* 에디션 선택 (하위 에디션이 존재하는 경우에만 노출) */}
        {masterId && hasSubEditionFlow && !editingReview && (
          <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-4 space-y-2 text-left">
            <label className="block text-xs font-bold text-neutral-700">
              {t('review.selectEdition')} <RequiredMark />
            </label>
            <select
              required
              aria-required="true"
              ref={editionSelectRef}
              value={pendingVariantDraft ? ADD_VARIANT_SELECT_VALUE : targetSpiritId ?? ''}
              onChange={(e) => {
                const val = e.target.value
                if (val === ADD_VARIANT_SELECT_VALUE) {
                  setTargetSpiritId(null)
                  setVariantError(null)
                  setVariantCreateOpen(true)
                  return
                }
                setTargetSpiritId(val === '' ? null : Number(val))
                setPendingVariantDraft(null)
                setVariantError(null)
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="">{t('review.selectEditionPlaceholder')}</option>
              {variants.map((v) => {
                const typeLabel = v.variantType ? t(`spirit.variantType.${v.variantType}`) : ''
                return (
                  <option key={v.id} value={v.id}>
                    [{typeLabel}] {v.variantValue || v.id} ({v.abv != null ? `${v.abv}%` : ''}{v.volumeMl ? `, ${v.volumeMl}ml` : ''})
                  </option>
                )
              })}
              <option value={ADD_VARIANT_SELECT_VALUE}>
                {t('review.addEditionSelectOption')}
              </option>
            </select>
            {variantError && (
              <p className="text-xs text-red-500 mt-1">{variantError}</p>
            )}
            <p className="text-[11px] text-neutral-400">
              {t('review.editionWarning')}
            </p>
          </div>
        )}

        {canAddVariant && pendingVariantDraft && (
          <div className="space-y-2">
            <ReviewVariantDraftCard
              draft={pendingVariantDraft}
              onEdit={() => setVariantCreateOpen(true)}
              onDelete={() => {
                setPendingVariantDraft(null)
                setTimeout(() => editionSelectRef.current?.focus(), 0)
              }}
            />
          </div>
        )}

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
              showAroma={showAroma}
              aromaWheelTitle={aromaWheelTitle}
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
              showAroma={showAroma}
              aromaWheelTitle={aromaWheelTitle}
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
              showAroma={showAroma}
              aromaWheelTitle={aromaWheelTitle}
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
                  maxLength={1000}
                  placeholder={t('review.overallPlaceholder')}
                  className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-xl resize-none
                    focus:outline-none focus:ring-2 focus:ring-primary-400
                    placeholder:text-neutral-400 min-h-[5rem]"
                />
                <div className="flex items-start justify-between mt-1">
                  <p className="text-xs text-red-500 min-h-[1rem]">{errors.comment?.message ?? ''}</p>
                  <p className="text-xs text-neutral-400 tabular-nums flex-shrink-0 ml-2">
                    {commentValue?.length ?? 0}/1000
                  </p>
                </div>
              </div>
            )}
          />
        </div>

        {serverError && (
          <p className="text-sm text-red-600">{serverErrorMessage}</p>
        )}

        <div className="h-px bg-neutral-200" aria-hidden="true" />

        <ReviewImageField
          value={reviewImages}
          onChange={setReviewImages}
          disabled={isPending}
        />

        <SocialPublishFields
          kind="review"
          selection={socialSelection}
          onChange={setSocialSelection}
          editing={Boolean(editingReview)}
          source={editingReview ? { type: 'REVIEW', id: editingReview.id } : undefined}
          retryIds={socialRetryIds}
          onRetryIdsChange={setSocialRetryIds}
          reviewSpiritId={targetSpiritId ?? masterId ?? spiritId}
          allowFirstPublishOnEdit={editingReview?.legacySocialPublishAllowed === true}
        />
        {socialError && <p className="text-sm text-red-600">{socialError}</p>}

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
      {masterId && (
        <ReviewVariantCreateModal
          open={variantCreateOpen}
          onClose={() => setVariantCreateOpen(false)}
          initialDraft={pendingVariantDraft}
          onCreated={(draft) => {
            setPendingVariantDraft(draft)
            setTargetSpiritId(null)
            setVariantError(null)
          }}
        />
      )}
    </Modal>
  )
}
