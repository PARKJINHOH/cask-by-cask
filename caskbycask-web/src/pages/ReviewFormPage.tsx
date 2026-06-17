import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useSpiritDetail, useSpiritVariants } from '@/domain/spirit/hooks/useSpiritDetail'
import Spinner from '@/shared/components/Spinner'
import Button from '@/shared/components/Button'
import SeoMeta from '@/shared/components/SeoMeta'
import { scoreColor } from '@/shared/utils/format'
import { useCreateReview, useUpdateReview } from '@/domain/review/hooks/useReviews'
import ReviewScoreSection from '@/domain/review/components/ReviewScoreSection'
import { getReviewSaveErrorMessage } from '@/domain/review/utils/reviewErrors'
import {
  EMPTY_AROMA_NOTES,
  parseAromaNotes,
  serializeAromaNotes,
  WHISKY_AROMA_CATEGORIES,
} from '@/domain/review/constants/whiskyAromas'
import { WINE_AROMA_CATEGORIES } from '@/domain/review/constants/wineAromas'
import { COGNAC_AROMA_CATEGORIES } from '@/domain/review/constants/cognacAromas'
import type { AromaCategory, AromaNotes } from '@/domain/review/constants/whiskyAromas'
import type { ReviewItem } from '@/domain/review/types/review.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

function getAromaCategories(category?: SpiritCategory): AromaCategory[] | undefined {
  if (category === 'WHISKY') return WHISKY_AROMA_CATEGORIES
  if (category === 'WINE') return WINE_AROMA_CATEGORIES
  if (category === 'COGNAC') return COGNAC_AROMA_CATEGORIES
  return undefined
}

function getAromaWheelKey(category?: SpiritCategory): string {
  if (category === 'WHISKY') return 'review.aromaWheelWhisky'
  if (category === 'WINE') return 'review.aromaWheelWine'
  if (category === 'COGNAC') return 'review.aromaWheelCognac'
  return 'review.aromaWheel'
}

const reviewSchema = z.object({
  noseScore:   z.number().min(0).max(100),
  tasteScore:  z.number().min(0).max(100),
  finishScore: z.number().min(0).max(100),
  noseNote:    z.string().min(20, '최소 20글자 이상 작성해주세요.').max(200, '200자 이내로 작성해주세요.'),
  tasteNote:   z.string().min(20, '최소 20글자 이상 작성해주세요.').max(200, '200자 이내로 작성해주세요.'),
  finishNote:  z.string().min(20, '최소 20글자 이상 작성해주세요.').max(200, '200자 이내로 작성해주세요.'),
  comment:     z.string().max(500, '500자 이내로 작성해주세요.').optional(),
})

type ReviewFormValues = z.infer<typeof reviewSchema>

interface LocationState {
  review?: ReviewItem
}

export default function ReviewFormPage() {
  const { id, reviewId } = useParams<{ id: string; reviewId?: string }>()
  const spiritId = Number(id)
  const isEdit = !!reviewId

  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const editingReview = (location.state as LocationState)?.review

  const { data: spirit, isLoading: spiritLoading } = useSpiritDetail(spiritId)

  // 마스터 ID 결정
  const masterId = spirit?.parentId || (spirit?.variants && spirit.variants.length > 0 ? spirit.id : null)
  // 마스터 ID가 있을 때만 하위 에디션 목록 조회
  const { data: variants = [] } = useSpiritVariants(masterId || 0)

  // 리뷰를 실제로 등록할 대상 Spirit ID
  const [targetSpiritId, setTargetSpiritId] = useState<number | null>(null)
  const [variantError, setVariantError] = useState<string | null>(null)

  // 초기 targetSpiritId 세팅 (spirit 로딩 완료 후)
  useEffect(() => {
    if (spirit) {
      if (spirit.parentId) {
        setTargetSpiritId(spirit.id)
      } else if (!spirit.variants || spirit.variants.length === 0) {
        setTargetSpiritId(spirit.id)
      }
    }
  }, [spirit])

  const createMutation = useCreateReview(targetSpiritId || spiritId)
  const updateMutation = useUpdateReview(spiritId)

  const aromaCategories = getAromaCategories(spirit?.category)
  const aromaWheelTitle = t(getAromaWheelKey(spirit?.category))

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
    if (isEdit && !editingReview) {
      navigate(`/spirits/${spiritId}`, { replace: true })
    }
  }, [isEdit, editingReview, navigate, spiritId])

  useEffect(() => {
    if (editingReview) {
      reset({
        noseScore:   editingReview.noseScore,
        tasteScore:  editingReview.tasteScore,
        finishScore: editingReview.finishScore,
        noseNote:    editingReview.noseNote    ?? '',
        tasteNote:   editingReview.tasteNote   ?? '',
        finishNote:  editingReview.finishNote  ?? '',
        comment:     editingReview.comment     ?? '',
      })
      setNoseAromas(parseAromaNotes(editingReview.noseAromaWheelNotes))
      setTasteAromas(parseAromaNotes(editingReview.tasteAromaWheelNotes))
      setFinishAromas(parseAromaNotes(editingReview.finishAromaWheelNotes))
    }
  }, [editingReview, reset])

  const [nose, taste, finish, commentValue, noseNote, tasteNote, finishNote] = watch([
    'noseScore', 'tasteScore', 'finishScore', 'comment',
    'noseNote', 'tasteNote', 'finishNote',
  ])
  const totalPreview = (nose + taste + finish) / 3

  const onSubmit = async (values: ReviewFormValues) => {
    if (masterId && variants.length > 0 && !isEdit && targetSpiritId === null) {
      setVariantError(t('review.selectEditionRequired'))
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
      noseAromaWheelNotes:   aromaCategories ? serializeAromaNotes(noseAromas)   : undefined,
      tasteAromaWheelNotes:  aromaCategories ? serializeAromaNotes(tasteAromas)  : undefined,
      finishAromaWheelNotes: aromaCategories ? serializeAromaNotes(finishAromas) : undefined,
    }
    if (isEdit && editingReview) {
      await updateMutation.mutateAsync({ reviewId: editingReview.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    navigate(`/spirits/${spiritId}`, { replace: true })
  }

  const handleCancel = () => navigate(-1)

  const isPending = createMutation.isPending || updateMutation.isPending || isSubmitting
  const serverError = createMutation.error || updateMutation.error
  const serverErrorMessage = serverError
    ? getReviewSaveErrorMessage(serverError, t('review.saveError'))
    : ''

  if (spiritLoading) return <Spinner fullscreen />

  const primaryName = isEn ? (spirit?.nameEn || spirit?.nameKo) : spirit?.nameKo

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <SeoMeta title={`${primaryName ?? ''} 리뷰 작성`} description="CaskByCask 리뷰 작성 페이지." noindex />
      {/* 뒤로가기 */}
      <button
        onClick={handleCancel}
        className="flex items-center gap-1 text-sm text-neutral-400 hover:text-primary-800 mb-5 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        {t('common.back')}
      </button>

      {/* 카드 래퍼 */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 md:p-8">

        {/* 헤더 */}
        <div className="mb-6 pb-5 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900">
            {isEdit ? t('review.edit') : t('review.write')}
          </h1>
          {primaryName && (
            <p className="text-sm text-neutral-500 mt-1">{primaryName}</p>
          )}
        </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* 에디션 선택 (하위 에디션이 존재하는 경우에만 노출) */}
        {masterId && variants.length > 0 && !isEdit && (
          <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-neutral-700">
              {t('review.selectEdition')} <span className="text-red-500">*</span>
            </label>
            <select
              value={targetSpiritId ?? ''}
              onChange={(e) => {
                const val = e.target.value
                setTargetSpiritId(val === '' ? null : Number(val))
                setVariantError(null)
              }}
              className="w-full sm:w-96 px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
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
              <option value={spirit?.parentId ? spirit.parentId : spirit?.id}>
                {t('review.editionUnknown')}
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

        {/* 향 */}
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
              aromaCategories={aromaCategories}
              aromaWheelTitle={aromaWheelTitle}
              aromaNote={noseAromas}
              onAromaNoteChange={setNoseAromas}
            />
          )}
        />

        {/* 맛 */}
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
              aromaCategories={aromaCategories}
              aromaWheelTitle={aromaWheelTitle}
              aromaNote={tasteAromas}
              onAromaNoteChange={setTasteAromas}
            />
          )}
        />

        {/* 피니시 */}
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
              aromaCategories={aromaCategories}
              aromaWheelTitle={aromaWheelTitle}
              aromaNote={finishAromas}
              onAromaNoteChange={setFinishAromas}
            />
          )}
        />

        {/* 총점 미리보기 + 총평 */}
        <div className="md:grid md:grid-cols-[180px_1fr] md:gap-5 md:items-start space-y-4 md:space-y-0">

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
          <p className="text-sm text-red-600">{serverErrorMessage}</p>
        )}

        <p className="text-[11px] text-neutral-400 text-center leading-relaxed px-2">
          {t('review.qualityWarning')}
        </p>

        <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100">
          <Button variant="secondary" size="sm" type="button" onClick={handleCancel} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" type="submit" isLoading={isPending}>
            {isEdit ? t('review.submitEdit') : t('review.submit')}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
