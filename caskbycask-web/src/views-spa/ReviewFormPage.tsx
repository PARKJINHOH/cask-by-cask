import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, Controller, type FieldErrors } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useSpiritDetail, useSpiritVariants } from '@/domain/spirit/hooks/useSpiritDetail'
import Spinner from '@/shared/components/Spinner'
import Button from '@/shared/components/Button'
import SeoMeta from '@/shared/components/SeoMeta'
import { scoreColor } from '@/shared/utils/format'
import {
  useCreateReview,
  useCreateVariantReviewRequest,
  useUpdateReview,
} from '@/domain/review/hooks/useReviews'
import ReviewScoreSection from '@/domain/review/components/ReviewScoreSection'
import ReviewVariantCreateModal, {
  type ReviewVariantDraft,
} from '@/domain/review/components/ReviewVariantCreateModal'
import ReviewVariantDraftCard from '@/domain/review/components/ReviewVariantDraftCard'
import MyPastReviewsPanel from '@/domain/review/components/MyPastReviewsPanel'
import { getReviewSaveErrorMessage } from '@/domain/review/utils/reviewErrors'
import {
  EMPTY_AROMA_NOTES,
  parseAromaNotes,
  profileForPhase,
  replacePhaseProfile,
  serializeAromaNotes,
  supportsAromaProfiles,
} from '@/domain/review/utils/aroma'
import type { AromaNotes } from '@/domain/review/utils/aroma'
import type { AromaProfile, ReviewItem } from '@/domain/review/types/review.types'
import { REVIEW_NOTE_MIN_LENGTH, REVIEW_TEXT_MAX_LENGTH } from '@/domain/review/constants/reviewLimits'
import { reviewApi } from '@/domain/review/api/reviewApi'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import SocialPublishFields from '@/domain/social/components/SocialPublishFields'
import { socialApi } from '@/domain/social/api/socialApi'
import { EMPTY_SOCIAL_SELECTION, type SocialPublishSelection } from '@/domain/social/types/social.types'
import { getLocalizedNames } from '@/domain/spirit/utils/spiritDisplayName'
import ReviewImageField, {
  existingReviewImageDrafts,
  reviewImageSubmission,
  type ReviewImageDraft,
} from '@/domain/review/components/ReviewImageField'
import Toast from '@/shared/components/Toast'
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog'
import { useToast } from '@/shared/hooks/useToast'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { focusFirstError } from '@/shared/utils/focusFirstError'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

const ADD_VARIANT_SELECT_VALUE = '__ADD_VARIANT__'

/**
 * 검증 오류를 잡을 때 훑는 순서 — 화면에 보이는 위(향)부터 아래(총평)까지다.
 * RHF 의 `errors` 는 객체라 키 순서가 화면 순서와 같다는 보장이 없어 직접 정한다.
 */
const FIELD_ORDER: (keyof ReviewFormValues)[] = [
  'noseScore', 'noseNote',
  'tasteScore', 'tasteNote',
  'finishScore', 'finishNote',
  'comment',
]

function getAromaWheelKey(category?: SpiritCategory): string {
  if (category === 'WHISKY') return 'review.aromaWheelWhisky'
  if (category === 'WINE') return 'review.aromaWheelWine'
  if (category === 'COGNAC') return 'review.aromaWheelCognac'
  return 'review.aromaWheel'
}

const NOTE_MIN = REVIEW_NOTE_MIN_LENGTH
const NOTE_MAX = REVIEW_TEXT_MAX_LENGTH

/**
 * 검증 메시지는 화면에 그대로 나오므로 번역을 거쳐야 한다.
 * 스키마를 상수로 두면 모듈 로드 시점의 언어에 문구가 굳어 EN 화면에 한국어가 남는다.
 */
const buildReviewSchema = (t: TFunction) => z.object({
  // 점수는 선택 — 비워 두면 평균 산출에서 빠지는 리뷰가 된다.
  noseScore:   z.number().min(0).max(100).nullable(),
  tasteScore:  z.number().min(0).max(100).nullable(),
  finishScore: z.number().min(0).max(100).nullable(),
  noseNote:    noteSchema(t),
  tasteNote:   noteSchema(t),
  finishNote:  noteSchema(t),
  comment:     z.string().max(NOTE_MAX, t('review.error.noteMax', { max: NOTE_MAX })).optional(),
}).superRefine((values, ctx) => {
  // 일부만 채우면 총점을 낼 수 없다 — 서버도 같은 규칙으로 막는다(REVIEW_013).
  const entered = SCORE_FIELDS.filter((field) => values[field] != null)
  if (entered.length === 0 || entered.length === SCORE_FIELDS.length) return
  for (const field of SCORE_FIELDS) {
    if (values[field] == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: t('review.error.scoreAllOrNone') })
    }
  }
})

const SCORE_FIELDS = ['noseScore', 'tasteScore', 'finishScore'] as const

const noteSchema = (t: TFunction) => z.string()
  .min(NOTE_MIN, t('review.error.noteMin', { min: NOTE_MIN }))
  .max(NOTE_MAX, t('review.error.noteMax', { max: NOTE_MAX }))

/**
 * 에디션 선택 항목의 표시 문구.
 *
 * 도수·용량이 둘 다 비어 있으면 예전에는 빈 괄호 `()` 만 남았고, 에디션 이름이 없으면
 * 내부 ID 숫자가 그대로 보였다. 값이 없는 조각은 아예 빼고, 이름이 없을 때는
 * 사람이 읽을 수 있는 문구로 대신한다.
 */
function formatEditionOption(
  variant: { id: number; variantType?: string | null; variantValue?: string | null; abv?: number | null; volumeMl?: number | null },
  t: TFunction,
): string {
  const typeLabel = variant.variantType ? t(`spirit.variantType.${variant.variantType}`) : ''
  const name = variant.variantValue?.trim() || t('review.editionUnnamed')
  const specs = [
    variant.abv != null ? `${variant.abv}%` : null,
    variant.volumeMl ? `${variant.volumeMl}ml` : null,
  ].filter(Boolean)

  return [
    typeLabel ? `[${typeLabel}]` : null,
    name,
    specs.length > 0 ? `(${specs.join(', ')})` : null,
  ].filter(Boolean).join(' ')
}

type ReviewFormValues = z.infer<ReturnType<typeof buildReviewSchema>>

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
  const { toasts, showToast, removeToast } = useToast()
  const reviewSchema = useMemo(() => buildReviewSchema(t), [t])

  const editingReview = (location.state as LocationState)?.review

  const { data: spirit, isLoading: spiritLoading } = useSpiritDetail(spiritId)

  // 마스터 ID 결정
  const hasSubEditionFlow = !!spirit && (
    !!spirit.parentId ||
    !!spirit.seriesIdentifier ||
    !!(spirit.variantType && spirit.variantType !== 'NONE') ||
    (spirit.variants?.length ?? 0) > 0
  )
  const masterId = spirit?.parentId || (hasSubEditionFlow ? spirit.id : null)
  // 마스터 ID가 있을 때만 하위 에디션 목록 조회
  const { data: variants = [] } = useSpiritVariants(masterId || 0)

  // 리뷰를 실제로 등록할 대상 Spirit ID
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

  // 페이지 진입 시 최상단으로 스크롤 이동
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // 초기 targetSpiritId 세팅 (spirit 로딩 완료 후)
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

  const showAroma = spirit?.category === 'WHISKY' || spirit?.category === 'WINE' || spirit?.category === 'COGNAC'
  const aromaWheelTitle = t(getAromaWheelKey(spirit?.category))

  const [noseAromas, setNoseAromas]     = useState<AromaNotes>(EMPTY_AROMA_NOTES)
  const [tasteAromas, setTasteAromas]   = useState<AromaNotes>(EMPTY_AROMA_NOTES)
  const [finishAromas, setFinishAromas] = useState<AromaNotes>(EMPTY_AROMA_NOTES)
  const [aromaProfiles, setAromaProfiles] = useState<AromaProfile[]>(editingReview?.aromaProfiles ?? [])

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty: formIsDirty },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      // 점수는 매기지 않은 상태로 시작한다 — 기본값을 넣어 두면 안 건드린 점수가 평균에 섞인다.
      noseScore:   editingReview?.noseScore   ?? null,
      tasteScore:  editingReview?.tasteScore  ?? null,
      finishScore: editingReview?.finishScore ?? null,
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
      setAromaProfiles(editingReview.aromaProfiles ?? [])
      setReviewImages(existingReviewImageDrafts(editingReview.images))
    }
  }, [editingReview, reset])

  const [nose, taste, finish, commentValue, noseNote, tasteNote, finishNote] = watch([
    'noseScore', 'tasteScore', 'finishScore', 'comment',
    'noseNote', 'tasteNote', 'finishNote',
  ])
  const hasAllScores = nose != null && taste != null && finish != null
  const totalPreview = hasAllScores ? (nose + taste + finish) / 3 : null

  const onSubmit = async (values: ReviewFormValues) => {
    if ((socialSelection.instagram || socialSelection.threads)
      && !socialSelection.consentAccepted) {
      setSocialError(t('social.consentRequired'))
      return
    }
    setSocialError('')
    if (masterId && hasSubEditionFlow && !isEdit && targetSpiritId === null && !pendingVariantDraft) {
      setVariantError(t(spirit?.category === 'WINE' ? 'review.selectVintageRequired' : 'review.selectEditionRequired'))
      setTimeout(() => {
        editionSelectRef.current?.focus()
      }, 0)
      return
    }

    const payload = {
      noseScore:             values.noseScore ?? null,
      tasteScore:            values.tasteScore ?? null,
      finishScore:           values.finishScore ?? null,
      noseNote:              values.noseNote.trim(),
      tasteNote:             values.tasteNote.trim(),
      finishNote:            values.finishNote.trim(),
      comment:               isEdit ? (values.comment?.trim() ?? '') : (values.comment?.trim() || undefined),
      noseAromaWheelNotes:   showAroma ? (serializeAromaNotes(noseAromas)   ?? (isEdit ? '' : undefined)) : undefined,
      tasteAromaWheelNotes:  showAroma ? (serializeAromaNotes(tasteAromas)  ?? (isEdit ? '' : undefined)) : undefined,
      finishAromaWheelNotes: showAroma ? (serializeAromaNotes(finishAromas) ?? (isEdit ? '' : undefined)) : undefined,
      aromaProfiles: supportsAromaProfiles(spirit?.category) ? aromaProfiles : [],
      ...(!isEdit ? { socialPublish: socialSelection } : {}),
    }
    const imageSubmission = reviewImageSubmission(reviewImages)
    if (isEdit && editingReview) {
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
      // 저장이 끝났으면 지킬 내용이 없다 — 이탈 확인창이 뜨지 않게 먼저 내린다.
      setSubmitted(true)
      navigate('/mypage?tab=reviews', { replace: true })
      return
    } else {
      await createMutation.mutateAsync({ data: payload, images: imageSubmission.files })
    }
    setSubmitted(true)
    navigate(`/spirits/${spiritId}`, { replace: true })
  }

  /**
   * 검증에 걸렸을 때의 안내.
   *
   * 노트 칸은 register 되지 않아 RHF 의 `shouldFocusError` 가 잡을 ref 가 없다.
   * 그대로 두면 모바일에서는 오류 문구가 화면 밖 위쪽에만 그려져 "등록이 안 눌린다"로 보인다.
   * 화면 순서대로 첫 오류를 찾아 직접 스크롤·포커스하고, 토스트로도 알린다.
   */
  const handleInvalid = (formErrors: FieldErrors<ReviewFormValues>) => {
    const ordered = FIELD_ORDER.filter((field) => formErrors[field])
    focusFirstError(ordered, '[data-review-form]')
    const firstMessage = ordered[0] ? formErrors[ordered[0]]?.message : undefined
    showToast(typeof firstMessage === 'string' ? firstMessage : t('review.error.checkFields'), 'error')
  }

  // ── 이탈 방지 ──
  // 리뷰는 노트 세 칸을 각 20자 이상 채워야 해서, 잃으면 다시 쓰는 비용이 크다.
  // 임시저장 기능이 없는 화면이라 확인창에는 '계속 쓰기 / 나가기'만 둔다.
  const [submitted, setSubmitted] = useState(false)
  const imagesDirty = reviewImages.length !== (editingReview?.images?.length ?? 0)
  const profilesDirty = JSON.stringify(aromaProfiles) !== JSON.stringify(editingReview?.aromaProfiles ?? [])
  const { leaveDialogOpen, guard, cancelLeave, confirmLeave } = useUnsavedChangesGuard({
    dirty: !submitted && (formIsDirty || imagesDirty || profilesDirty),
    onLeave: () => navigate(`/spirits/${spiritId}`),
  })

  const handleCancel = () => guard(() => navigate(-1))

  const isPending =
    createMutation.isPending ||
    createVariantReviewRequest.isPending ||
    updateMutation.isPending ||
    isSubmitting
  const serverError = createMutation.error || createVariantReviewRequest.error || updateMutation.error
  const serverErrorMessage = serverError
    ? getReviewSaveErrorMessage(
        serverError,
        t('review.saveError'),
        {
          REVIEW_011: t('review.aromaProfile.errorInvalid'),
          REVIEW_012: t('review.aromaProfile.errorUnsupported'),
        },
        {
          network: t('common.uploadReason.network'),
          auth: t('common.uploadReason.auth'),
          tooLarge: t('common.uploadReason.tooLarge'),
          rateLimited: t('common.uploadReason.rateLimited'),
          server: t('common.uploadReason.server'),
        },
      )
    : ''

  // 저장 실패는 제출 버튼 바로 위에 문구로도 남지만, 폼이 길어 사용자가 다른 곳을 보고 있을 수 있다.
  // 새 오류가 올 때마다 토스트로 한 번 더 알린다(같은 오류를 반복해서 띄우지는 않는다).
  const notifiedErrorRef = useRef<unknown>(null)
  useEffect(() => {
    if (!serverError || notifiedErrorRef.current === serverError) return
    notifiedErrorRef.current = serverError
    showToast(serverErrorMessage, 'error')
  }, [serverError, serverErrorMessage, showToast])
  const canAddVariant = !!masterId && hasSubEditionFlow && !isEdit && spirit?.category !== 'WINE'

  if (spiritLoading) return <Spinner fullscreen />

  const primaryName = getLocalizedNames(spirit?.nameKo, spirit?.nameEn, i18n.language).primaryName

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" data-review-form>
      <SeoMeta title={`${primaryName ?? ''} 리뷰 작성`} description="CaskByCask 리뷰 작성 페이지." noindex />
      <Toast toasts={toasts} onRemove={removeToast} />
      <UnsavedChangesDialog
        open={leaveDialogOpen}
        onStay={cancelLeave}
        onDiscard={() => { void confirmLeave() }}
      />
      <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-6 lg:items-start">
      <MyPastReviewsPanel
        spiritCategory={spirit?.category}
        excludeReviewId={editingReview?.id}
        currentNoseScore={nose}
        currentTasteScore={taste}
        currentFinishScore={finish}
      />

      {/* 카드 래퍼 */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 sm:p-6 md:p-8 min-w-0">

        {/* 헤더 */}
        <div className="mb-6 pb-5 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900">
            {isEdit ? t('review.edit') : t('review.write')}
          </h1>
          {/* 긴 주류명이 좁은 화면에서 헤더를 통째로 밀어내지 않도록 두 줄로 자른다 */}
          {primaryName && (
            <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{primaryName}</p>
          )}
        </div>

      <form onSubmit={handleSubmit(onSubmit, handleInvalid)} className="space-y-4">
        <RequiredFieldsNotice />

        {/* 에디션 선택 (하위 에디션이 존재하는 경우에만 노출) */}
        {masterId && hasSubEditionFlow && !isEdit && (
          <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-neutral-700">
              {t(spirit?.category === 'WINE' ? 'review.selectVintage' : 'review.selectEdition')} <RequiredMark />
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
              className="w-full sm:w-96 px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="">{t(spirit?.category === 'WINE' ? 'review.selectVintagePlaceholder' : 'review.selectEditionPlaceholder')}</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{formatEditionOption(v, t)}</option>
              ))}
              {spirit?.category !== 'WINE' && (
                <option value={ADD_VARIANT_SELECT_VALUE}>{t('review.addEditionSelectOption')}</option>
              )}
            </select>
            {variantError && (
              <p className="text-xs text-red-500 mt-1">{variantError}</p>
            )}
            <p className="text-[11px] text-neutral-400">
              {t(spirit?.category === 'WINE' ? 'review.vintageWarning' : 'review.editionWarning')}
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
              onNoteChange={(v) => setValue('noseNote', v, { shouldValidate: true, shouldDirty: true })}
              notePlaceholder={t('review.nosePlaceholder')}
              scoreError={errors.noseScore?.message}
              noteError={errors.noseNote?.message}
              noteFieldName="noseNote"
              showAroma={showAroma}
              aromaWheelTitle={aromaWheelTitle}
              aromaNote={noseAromas}
              onAromaNoteChange={setNoseAromas}
              profileEnabled={spirit?.category === 'WHISKY'}
              profilePhase="NOSE"
              aromaProfile={profileForPhase(aromaProfiles, 'NOSE')}
              onAromaProfileChange={(profile) => setAromaProfiles((current) =>
                replacePhaseProfile(current, 'NOSE', profile))}
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
              onNoteChange={(v) => setValue('tasteNote', v, { shouldValidate: true, shouldDirty: true })}
              notePlaceholder={t('review.tastePlaceholder')}
              scoreError={errors.tasteScore?.message}
              noteError={errors.tasteNote?.message}
              noteFieldName="tasteNote"
              showAroma={showAroma}
              aromaWheelTitle={aromaWheelTitle}
              aromaNote={tasteAromas}
              onAromaNoteChange={setTasteAromas}
              profileEnabled={spirit?.category === 'WHISKY'}
              profilePhase="PALATE"
              aromaProfile={profileForPhase(aromaProfiles, 'PALATE')}
              onAromaProfileChange={(profile) => setAromaProfiles((current) =>
                replacePhaseProfile(current, 'PALATE', profile))}
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
              onNoteChange={(v) => setValue('finishNote', v, { shouldValidate: true, shouldDirty: true })}
              notePlaceholder={t('review.finishPlaceholder')}
              scoreError={errors.finishScore?.message}
              noteError={errors.finishNote?.message}
              noteFieldName="finishNote"
              showAroma={showAroma}
              aromaWheelTitle={aromaWheelTitle}
              aromaNote={finishAromas}
              onAromaNoteChange={setFinishAromas}
              profileEnabled={spirit?.category === 'WHISKY'}
              profilePhase="FINISH"
              aromaProfile={profileForPhase(aromaProfiles, 'FINISH')}
              onAromaProfileChange={(profile) => setAromaProfiles((current) =>
                replacePhaseProfile(current, 'FINISH', profile))}
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
              style={{ color: totalPreview == null ? '#a3a3a3' : scoreColor(totalPreview) }}
            >
              {totalPreview == null ? '–' : totalPreview.toFixed(1)}
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
                <AutoGrowTextarea
                  {...field}
                  rows={4}
                  maxLength={REVIEW_TEXT_MAX_LENGTH}
                  placeholder={t('review.overallPlaceholder')}
                  className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-primary-400
                    placeholder:text-neutral-400 min-h-[5rem]"
                />
                <div className="flex items-start justify-between mt-1">
                  <p className="text-xs text-red-500 min-h-[1rem]">{errors.comment?.message ?? ''}</p>
                  <p className="text-xs text-neutral-400 tabular-nums flex-shrink-0 ml-2">
                    {commentValue?.length ?? 0}/{REVIEW_TEXT_MAX_LENGTH}
                  </p>
                </div>
              </div>
            )}
          />
        </div>

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
          editing={isEdit}
          source={editingReview ? { type: 'REVIEW', id: editingReview.id } : undefined}
          retryIds={socialRetryIds}
          onRetryIdsChange={setSocialRetryIds}
          reviewSpiritId={targetSpiritId ?? masterId ?? spiritId}
          allowFirstPublishOnEdit={editingReview?.legacySocialPublishAllowed === true}
        />
        {socialError && <p className="text-sm text-red-600">{socialError}</p>}

        <p className="text-[11px] text-neutral-400 text-center leading-relaxed px-2">
          {t('review.qualityWarning')}
        </p>

        {/* 저장 실패 문구는 제출 버튼과 같은 화면 안에 둔다 —
            사진·소셜 발행 섹션 위에 있으면 모바일에서는 항상 뷰포트 밖이었다. */}
        {serverError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverErrorMessage}
          </p>
        )}

        {/* size="md" 는 모바일에서 h-11(44px) 로 커진다 — sm 은 32px 라 터치 최소치에 못 미친다 */}
        <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100">
          <Button variant="secondary" type="button" onClick={handleCancel} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEdit ? t('review.submitEdit') : t('review.submit')}
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
      </div>
      </div>
    </div>
  )
}
