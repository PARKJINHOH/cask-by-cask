import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import Button from '@/shared/components/Button'
import SeoMeta from '@/shared/components/SeoMeta'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import { scoreColor } from '@/shared/utils/format'
import ReviewScoreSection from '@/domain/review/components/ReviewScoreSection'
import ReviewImageField, {
  existingReviewImageDrafts,
  reviewImageSubmission,
  type ReviewImageDraft,
} from '@/domain/review/components/ReviewImageField'
import SocialPublishFields from '@/domain/social/components/SocialPublishFields'
import { socialApi } from '@/domain/social/api/socialApi'
import { reviewApi } from '@/domain/review/api/reviewApi'
import {
  useMyReview,
  useMyReviewRequest,
  useResubmitMyReviewRequest,
  useUpdateMyReviewRequest,
  useUpdateReview,
} from '@/domain/review/hooks/useReviews'
import { getReviewSaveErrorMessage } from '@/domain/review/utils/reviewErrors'
import {
  EMPTY_AROMA_NOTES,
  parseAromaNotes,
  serializeAromaNotes,
  type AromaNotes,
} from '@/domain/review/utils/aroma'
import { reviewSpiritLabel, variantRequestSpiritLabel } from '@/domain/review/utils/reviewDisplay'
import { getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
import { EMPTY_SOCIAL_SELECTION, type SocialPublishSelection } from '@/domain/social/types/social.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

const MY_REVIEWS_PATH = '/mypage?tab=reviews'
const NOTE_MIN_LENGTH = 20

type FieldErrorKey = 'variantValue' | 'abv' | 'volumeMl' | 'noseNote' | 'tasteNote' | 'finishNote'
type FieldErrors = Partial<Record<FieldErrorKey, string>>

/** 하위 에디션 요청의 편집 가능 형태 */
type RequestMode = 'pending' | 'resubmit' | 'locked'

function aromaWheelKey(category?: SpiritCategory | null): string {
  if (category === 'WHISKY') return 'review.aromaWheelWhisky'
  if (category === 'WINE') return 'review.aromaWheelWine'
  if (category === 'COGNAC') return 'review.aromaWheelCognac'
  return 'review.aromaWheel'
}

export default function ReviewEditPage() {
  const { reviewId: reviewIdParam, requestId: requestIdParam } = useParams<{
    reviewId?: string
    requestId?: string
  }>()
  const isRequest = requestIdParam !== undefined
  const reviewId = Number(reviewIdParam)
  const requestId = Number(requestIdParam)

  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const reviewQuery = useMyReview(isRequest ? 0 : reviewId)
  const requestQuery = useMyReviewRequest(isRequest ? requestId : 0)
  const review = isRequest ? undefined : reviewQuery.data
  const request = isRequest ? requestQuery.data : undefined
  const isLoading = isRequest ? requestQuery.isLoading : reviewQuery.isLoading
  const isError = isRequest ? requestQuery.isError : reviewQuery.isError

  const requestMode: RequestMode = !request
    ? 'locked'
    : request.status === 'PENDING'
      ? 'pending'
      : request.status === 'REJECTED' && !!request.linkedVariantId && !request.reviewId
        ? 'resubmit'
        : 'locked'
  const isEditable = isRequest ? requestMode !== 'locked' : true
  // 에디션 정보는 승인 대기 요청에서만 수정할 수 있다.
  const canEditEdition = isRequest && requestMode === 'pending'

  const category: SpiritCategory | null | undefined = isRequest
    ? request?.masterCategory
    : review?.spiritCategory
  const showAroma = category === 'WHISKY' || category === 'WINE' || category === 'COGNAC'

  // ── 폼 상태 ────────────────────────────────────────────
  const [variantValue, setVariantValue] = useState('')
  const [variantValueEn, setVariantValueEn] = useState('')
  const [abv, setAbv] = useState('')
  const [volumeMl, setVolumeMl] = useState('')
  const [requestMemo, setRequestMemo] = useState('')
  const [noseScore, setNoseScore] = useState(70)
  const [tasteScore, setTasteScore] = useState(70)
  const [finishScore, setFinishScore] = useState(70)
  const [noseNote, setNoseNote] = useState('')
  const [tasteNote, setTasteNote] = useState('')
  const [finishNote, setFinishNote] = useState('')
  const [comment, setComment] = useState('')
  const [noseAromas, setNoseAromas] = useState<AromaNotes>(EMPTY_AROMA_NOTES)
  const [tasteAromas, setTasteAromas] = useState<AromaNotes>(EMPTY_AROMA_NOTES)
  const [finishAromas, setFinishAromas] = useState<AromaNotes>(EMPTY_AROMA_NOTES)
  const [reviewImages, setReviewImages] = useState<ReviewImageDraft[]>([])
  const [socialSelection, setSocialSelection] = useState<SocialPublishSelection>(EMPTY_SOCIAL_SELECTION)
  const [socialRetryIds, setSocialRetryIds] = useState<number[]>([])
  const [socialError, setSocialError] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const variantValueRef = useRef<HTMLInputElement>(null)
  const abvRef = useRef<HTMLInputElement>(null)
  const volumeMlRef = useRef<HTMLInputElement>(null)

  const updateReviewMutation = useUpdateReview(review?.spiritId ?? 0)
  const updateRequestMutation = useUpdateMyReviewRequest()
  const resubmitRequestMutation = useResubmitMyReviewRequest()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // 서버에서 읽은 값으로 폼 초기화 (새로고침·딥링크 진입에도 동작)
  useEffect(() => {
    const source = review ?? request
    if (!source) return
    setNoseScore(Number(source.noseScore))
    setTasteScore(Number(source.tasteScore))
    setFinishScore(Number(source.finishScore))
    setNoseNote(source.noseNote ?? '')
    setTasteNote(source.tasteNote ?? '')
    setFinishNote(source.finishNote ?? '')
    setComment(source.comment ?? '')
    setNoseAromas(parseAromaNotes(source.noseAromaWheelNotes))
    setTasteAromas(parseAromaNotes(source.tasteAromaWheelNotes))
    setFinishAromas(parseAromaNotes(source.finishAromaWheelNotes))
    setReviewImages(existingReviewImageDrafts(source.images))
    setErrors({})
    if (request) {
      setVariantValue(request.variantValue ?? '')
      setVariantValueEn(request.variantValueEn ?? '')
      setAbv(request.abv != null ? String(request.abv) : '')
      setVolumeMl(request.volumeMl != null ? String(request.volumeMl) : '')
      setRequestMemo(request.requestMemo ?? '')
    }
  }, [review, request])

  const label = useMemo(() => {
    if (review) return reviewSpiritLabel(review, isEn)
    if (request) return variantRequestSpiritLabel(request, isEn)
    return { title: '', editionValue: null }
  }, [review, request, isEn])

  const totalPreview = (noseScore + tasteScore + finishScore) / 3
  const isPending =
    updateReviewMutation.isPending ||
    updateRequestMutation.isPending ||
    resubmitRequestMutation.isPending
  const serverError =
    updateReviewMutation.error || updateRequestMutation.error || resubmitRequestMutation.error
  const serverErrorMessage = serverError
    ? getReviewSaveErrorMessage(serverError, t('review.saveError'))
    : ''

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (noseNote.trim().length < NOTE_MIN_LENGTH) next.noseNote = t('mypage.reviews.pendingRequiredNote')
    if (tasteNote.trim().length < NOTE_MIN_LENGTH) next.tasteNote = t('mypage.reviews.pendingRequiredNote')
    if (finishNote.trim().length < NOTE_MIN_LENGTH) next.finishNote = t('mypage.reviews.pendingRequiredNote')
    if (!canEditEdition) return next

    const abvValue = Number(abv)
    const volumeValue = Number(volumeMl)
    if (!variantValue.trim()) next.variantValue = t('mypage.reviews.pendingRequiredEdition')
    if (!abv.trim() || Number.isNaN(abvValue) || abvValue < 0 || abvValue > 100) {
      next.abv = t('mypage.reviews.pendingRequiredAbv')
    }
    if (!volumeMl.trim() || Number.isNaN(volumeValue) || volumeValue < 1 || volumeValue > 100000) {
      next.volumeMl = t('mypage.reviews.pendingRequiredVolume')
    }
    return next
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSocialError('')
    // 이미 처리된 요청은 저장 버튼이 비활성이지만, Enter 제출도 함께 막는다.
    if (!isEditable) return

    if ((socialSelection.instagram || socialSelection.threads) && !socialSelection.consentAccepted) {
      setSocialError(t('social.consentRequired'))
      return
    }

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.variantValue) variantValueRef.current?.focus()
      else if (nextErrors.abv) abvRef.current?.focus()
      else if (nextErrors.volumeMl) volumeMlRef.current?.focus()
      return
    }

    const media = reviewImageSubmission(reviewImages)
    const scores = {
      noseScore,
      tasteScore,
      finishScore,
      noseNote: noseNote.trim(),
      tasteNote: tasteNote.trim(),
      finishNote: finishNote.trim(),
      comment: comment.trim() || undefined,
      noseAromaWheelNotes: showAroma ? serializeAromaNotes(noseAromas) : undefined,
      tasteAromaWheelNotes: showAroma ? serializeAromaNotes(tasteAromas) : undefined,
      finishAromaWheelNotes: showAroma ? serializeAromaNotes(finishAromas) : undefined,
    }

    if (review) {
      await updateReviewMutation.mutateAsync({
        reviewId: review.id,
        data: scores,
        imagePlan: media.imagePlan,
        images: media.files,
      })
      try {
        if (socialSelection.instagram || socialSelection.threads) {
          await reviewApi.requestInitialSocialPublications(review.spiritId, review.id, socialSelection)
        }
        await Promise.all(socialRetryIds.map((publicationId) => socialApi.retry(publicationId)))
      } catch {
        setSocialError(t('social.initialPublishError'))
        return
      }
    } else if (request) {
      const payload = {
        ...scores,
        // 재승인 요청에서는 에디션 정보를 서버가 연결된 하위 에디션 값으로 덮어쓴다.
        variantValue: variantValue.trim() || request.variantValue,
        variantValueEn: variantValueEn.trim() || null,
        abv: canEditEdition ? Math.round(Number(abv) * 10) / 10 : request.abv,
        volumeMl: canEditEdition ? Math.round(Number(volumeMl)) : request.volumeMl,
        requestMemo: requestMemo.trim() || null,
      }
      const mutation = requestMode === 'resubmit' ? resubmitRequestMutation : updateRequestMutation
      await mutation.mutateAsync({
        requestId: request.id,
        data: payload,
        imagePlan: media.imagePlan,
        images: media.files,
      })
      try {
        await Promise.all(socialRetryIds.map((publicationId) => socialApi.retry(publicationId)))
      } catch {
        setSocialError(t('social.initialPublishError'))
        return
      }
    }

    navigate(MY_REVIEWS_PATH, { replace: true })
  }

  if (isLoading) return <Spinner fullscreen />

  if (isError || (!review && !request)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-neutral-900">{t('mypage.reviews.editNotFound')}</h1>
        <Link to={MY_REVIEWS_PATH} className="mt-5 inline-block text-sm font-semibold text-primary-800">
          {t('mypage.reviews.backToList')}
        </Link>
      </div>
    )
  }

  const spiritPath = review
    ? getSpiritDetailPath({
        id: review.spiritId,
        spiritCanonicalPathKo: review.spiritCanonicalPathKo,
        spiritCanonicalPathEn: review.spiritCanonicalPathEn,
      }, i18n.language)
    : request
      ? getSpiritDetailPath({
          id: request.masterSpiritId,
          spiritCanonicalPathKo: request.masterCanonicalPathKo,
          spiritCanonicalPathEn: request.masterCanonicalPathEn,
        }, i18n.language)
      : '#'

  const headerNotice = isRequest
    ? requestMode === 'resubmit'
      ? t('mypage.reviews.rejectedEditDesc')
      : requestMode === 'pending'
        ? t('mypage.reviews.pendingDesc')
        : t('mypage.reviews.editLocked')
    : null

  const displayAbv = review ? review.spiritAbv : request?.abv
  const displayVolumeMl = review ? review.spiritVolumeMl : request?.volumeMl

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <SeoMeta title={`${label.title} ${t('review.edit')}`} description="CaskByCask 리뷰 수정 페이지." noindex />

      <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm md:p-8">
        {/* 헤더 */}
        <div className="mb-6 border-b border-neutral-100 pb-5">
          <h1 className="text-xl font-bold text-neutral-900">
            {isRequest && requestMode === 'resubmit' ? t('mypage.reviews.rejectedEditTitle') : t('review.edit')}
          </h1>
          <Link to={spiritPath} className="mt-2 block text-sm font-semibold text-neutral-700 hover:text-primary-800">
            {label.title}
          </Link>
          {label.editionValue && (
            <p className="mt-0.5 text-xs font-semibold text-primary-700">{label.editionValue}</p>
          )}
          {headerNotice && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              {headerNotice}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RequiredFieldsNotice />

          {/* 에디션 정보 */}
          <section className="space-y-3 rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-neutral-800">{t('mypage.reviews.editionSection')}</h2>
              {!canEditEdition && (
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
                  {t('mypage.reviews.editionReadOnly')}
                </span>
              )}
            </div>

            {canEditEdition ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                      {t('review.addEditionValueKoLabel')} <RequiredMark />
                    </label>
                    <input
                      ref={variantValueRef}
                      value={variantValue}
                      onChange={(event) => {
                        setVariantValue(event.target.value)
                        setErrors((prev) => ({ ...prev, variantValue: undefined }))
                      }}
                      maxLength={100}
                      placeholder={t('review.addEditionValueKoPlaceholder')}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                        errors.variantValue ? 'border-red-400' : 'border-neutral-300'
                      }`}
                    />
                    {errors.variantValue && <p className="mt-1 text-xs text-red-500">{errors.variantValue}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                      {t('review.addEditionValueEnLabel')}
                    </label>
                    <input
                      value={variantValueEn}
                      onChange={(event) => setVariantValueEn(event.target.value)}
                      maxLength={100}
                      placeholder={t('review.addEditionValueEnPlaceholder')}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                      {t('review.addEditionAbvLabel')} <RequiredMark />
                    </label>
                    <input
                      ref={abvRef}
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={abv}
                      onChange={(event) => {
                        setAbv(event.target.value)
                        setErrors((prev) => ({ ...prev, abv: undefined }))
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                        errors.abv ? 'border-red-400' : 'border-neutral-300'
                      }`}
                    />
                    {errors.abv && <p className="mt-1 text-xs text-red-500">{errors.abv}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                      {t('review.addEditionVolumeLabel')} <RequiredMark />
                    </label>
                    <input
                      ref={volumeMlRef}
                      type="number"
                      min={1}
                      max={100000}
                      value={volumeMl}
                      onChange={(event) => {
                        setVolumeMl(event.target.value)
                        setErrors((prev) => ({ ...prev, volumeMl: undefined }))
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                        errors.volumeMl ? 'border-red-400' : 'border-neutral-300'
                      }`}
                    />
                    {errors.volumeMl && <p className="mt-1 text-xs text-red-500">{errors.volumeMl}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                    {t('review.addEditionMemoLabel')}
                  </label>
                  <textarea
                    value={requestMemo}
                    onChange={(event) => setRequestMemo(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder={t('review.addEditionMemoPlaceholder')}
                    className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </>
            ) : (
              <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="w-20 flex-shrink-0 text-neutral-500">{t('mypage.reviews.editionSpirit')}</dt>
                  <dd className="min-w-0 font-semibold text-neutral-800">{label.title}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 flex-shrink-0 text-neutral-500">{t('review.addEditionValueKoLabel')}</dt>
                  <dd className="min-w-0 font-semibold text-primary-700">{label.editionValue ?? '-'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 flex-shrink-0 text-neutral-500">{t('review.addEditionAbvLabel')}</dt>
                  <dd className="font-semibold text-neutral-800">
                    {displayAbv != null ? `${displayAbv}%` : '-'}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 flex-shrink-0 text-neutral-500">{t('review.addEditionVolumeLabel')}</dt>
                  <dd className="font-semibold text-neutral-800">
                    {displayVolumeMl != null ? `${displayVolumeMl}ml` : '-'}
                  </dd>
                </div>
              </dl>
            )}
            {!canEditEdition && (
              <p className="text-[11px] leading-relaxed text-neutral-500">
                {t('mypage.reviews.editionReadOnlyHelp')}
              </p>
            )}
          </section>

          {/* 향 */}
          <ReviewScoreSection
            label={t('review.nose')}
            score={noseScore}
            onScoreChange={setNoseScore}
            note={noseNote}
            onNoteChange={(value) => {
              setNoseNote(value)
              setErrors((prev) => ({ ...prev, noseNote: undefined }))
            }}
            notePlaceholder={t('review.nosePlaceholder')}
            noteError={errors.noseNote}
            showAroma={showAroma}
            aromaWheelTitle={t(aromaWheelKey(category))}
            aromaNote={noseAromas}
            onAromaNoteChange={setNoseAromas}
          />

          {/* 맛 */}
          <ReviewScoreSection
            label={t('review.taste')}
            score={tasteScore}
            onScoreChange={setTasteScore}
            note={tasteNote}
            onNoteChange={(value) => {
              setTasteNote(value)
              setErrors((prev) => ({ ...prev, tasteNote: undefined }))
            }}
            notePlaceholder={t('review.tastePlaceholder')}
            noteError={errors.tasteNote}
            showAroma={showAroma}
            aromaWheelTitle={t(aromaWheelKey(category))}
            aromaNote={tasteAromas}
            onAromaNoteChange={setTasteAromas}
          />

          {/* 피니시 */}
          <ReviewScoreSection
            label={t('review.finish')}
            score={finishScore}
            onScoreChange={setFinishScore}
            note={finishNote}
            onNoteChange={(value) => {
              setFinishNote(value)
              setErrors((prev) => ({ ...prev, finishNote: undefined }))
            }}
            notePlaceholder={t('review.finishPlaceholder')}
            noteError={errors.finishNote}
            showAroma={showAroma}
            aromaWheelTitle={t(aromaWheelKey(category))}
            aromaNote={finishAromas}
            onAromaNoteChange={setFinishAromas}
          />

          {/* 총점 미리보기 + 총평 */}
          <div className="space-y-4 md:grid md:grid-cols-[180px_1fr] md:items-start md:gap-5 md:space-y-0">
            <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3
              md:h-full md:flex-col md:items-center md:justify-center md:gap-1">
              <div className="md:text-center">
                <p className="text-xs font-medium text-neutral-600">{t('review.totalPreview')}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{t('review.totalPreviewHint')}</p>
              </div>
              <span
                className="text-3xl font-bold tabular-nums md:text-4xl"
                style={{ color: scoreColor(totalPreview) }}
              >
                {totalPreview.toFixed(1)}
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                {t('review.overall')}{' '}
                <span className="text-xs font-normal text-neutral-400">({t('review.overallHint')})</span>
              </label>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder={t('review.overallPlaceholder')}
                className="min-h-[5rem] w-full resize-none rounded-xl border border-neutral-300 px-3 py-2.5 text-sm
                  placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-neutral-400">{comment.length}/1000</p>
            </div>
          </div>

          {serverError && <p className="text-sm text-red-600">{serverErrorMessage}</p>}

          <div className="h-px bg-neutral-200" aria-hidden="true" />

          {/* 사진 */}
          <ReviewImageField value={reviewImages} onChange={setReviewImages} disabled={isPending} />

          {/* SNS 업로드 */}
          <SocialPublishFields
            kind="review"
            selection={socialSelection}
            onChange={setSocialSelection}
            editing
            source={
              review
                ? { type: 'REVIEW', id: review.id }
                : request
                  ? { type: 'VARIANT_REVIEW_REQUEST', id: request.id }
                  : undefined
            }
            retryIds={socialRetryIds}
            onRetryIdsChange={setSocialRetryIds}
            reviewSpiritId={review?.spiritId ?? request?.masterSpiritId}
            allowFirstPublishOnEdit={review?.legacySocialPublishAllowed === true}
          />
          {socialError && <p className="text-sm text-red-600">{socialError}</p>}

          <p className="px-2 text-center text-[11px] leading-relaxed text-neutral-400">
            {t('review.qualityWarning')}
          </p>

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => navigate(MY_REVIEWS_PATH)}
              disabled={isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button size="sm" type="submit" isLoading={isPending} disabled={!isEditable}>
              {isRequest && requestMode === 'resubmit'
                ? t('mypage.reviews.rejectedResubmit')
                : t('review.submitEdit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
