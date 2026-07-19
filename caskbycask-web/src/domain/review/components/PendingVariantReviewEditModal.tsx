import { FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import ReviewScoreSection from './ReviewScoreSection'
import { EMPTY_AROMA_NOTES } from '../utils/aroma'
import type { CreateVariantReviewRequest, VariantReviewRequestItem } from '../types/review.types'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'

interface Props {
  open: boolean
  request: VariantReviewRequestItem
  isLoading: boolean
  mode?: 'pending' | 'resubmitReview'
  onClose: () => void
  onSubmit: (data: CreateVariantReviewRequest) => Promise<void>
}

type FieldErrors = Partial<Record<'variantValue' | 'abv' | 'volumeMl' | 'noseNote' | 'tasteNote' | 'finishNote', string>>

export default function PendingVariantReviewEditModal({
  open,
  request,
  isLoading,
  mode = 'pending',
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation()
  const isReviewOnly = mode === 'resubmitReview'
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
  const [errors, setErrors] = useState<FieldErrors>({})

  const variantValueRef = useRef<HTMLInputElement>(null)
  const abvRef = useRef<HTMLInputElement>(null)
  const volumeMlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setVariantValue(request.variantValue ?? '')
    setVariantValueEn(request.variantValueEn ?? '')
    setAbv(request.abv != null ? String(request.abv) : '')
    setVolumeMl(request.volumeMl != null ? String(request.volumeMl) : '')
    setRequestMemo(request.requestMemo ?? '')
    setNoseScore(request.noseScore ?? 70)
    setTasteScore(request.tasteScore ?? 70)
    setFinishScore(request.finishScore ?? 70)
    setNoseNote(request.noseNote ?? '')
    setTasteNote(request.tasteNote ?? '')
    setFinishNote(request.finishNote ?? '')
    setComment(request.comment ?? '')
    setErrors({})
  }, [open, request])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const abvValue = Number(abv)
    const volumeValue = Number(volumeMl)
    const nextErrors: FieldErrors = {}

    if (!variantValue.trim()) nextErrors.variantValue = t('mypage.reviews.pendingRequiredEdition')
    if (!abv.trim() || Number.isNaN(abvValue) || abvValue < 0 || abvValue > 100) {
      nextErrors.abv = t('mypage.reviews.pendingRequiredAbv')
    }
    if (!volumeMl.trim() || Number.isNaN(volumeValue) || volumeValue < 1 || volumeValue > 100000) {
      nextErrors.volumeMl = t('mypage.reviews.pendingRequiredVolume')
    }
    if (noseNote.trim().length < 20) nextErrors.noseNote = t('mypage.reviews.pendingRequiredNote')
    if (tasteNote.trim().length < 20) nextErrors.tasteNote = t('mypage.reviews.pendingRequiredNote')
    if (finishNote.trim().length < 20) nextErrors.finishNote = t('mypage.reviews.pendingRequiredNote')

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.variantValue) variantValueRef.current?.focus()
      else if (nextErrors.abv) abvRef.current?.focus()
      else if (nextErrors.volumeMl) volumeMlRef.current?.focus()
      return
    }

    await onSubmit({
      variantValue: variantValue.trim(),
      variantValueEn: variantValueEn.trim() || null,
      abv: Math.round(abvValue * 10) / 10,
      volumeMl: Math.round(volumeValue),
      requestMemo: requestMemo.trim() || null,
      noseScore,
      tasteScore,
      finishScore,
      noseNote: noseNote.trim(),
      tasteNote: tasteNote.trim(),
      finishNote: finishNote.trim(),
      comment: comment.trim() || undefined,
      noseAromaWheelNotes: request.noseAromaWheelNotes ?? undefined,
      tasteAromaWheelNotes: request.tasteAromaWheelNotes ?? undefined,
      finishAromaWheelNotes: request.finishAromaWheelNotes ?? undefined,
    })
  }

  const totalPreview = (noseScore + tasteScore + finishScore) / 3

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReviewOnly ? t('mypage.reviews.rejectedEditTitle') : t('mypage.reviews.pendingEditTitle')}
      size="2xl"
      closeOnOverlay={!isLoading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <RequiredFieldsNotice />
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-900">
            {isReviewOnly ? t('mypage.reviews.rejectedTitle') : t('mypage.reviews.pendingTitle')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            {isReviewOnly ? t('mypage.reviews.rejectedEditDesc') : t('mypage.reviews.pendingDesc')}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
              {t('review.addEditionValueKoLabel')} <RequiredMark />
            </label>
            <input
              ref={variantValueRef}
              required
              aria-required="true"
              value={variantValue}
              onChange={(event) => {
                setVariantValue(event.target.value)
                setErrors((prev) => ({ ...prev, variantValue: undefined }))
              }}
              maxLength={100}
              disabled={isReviewOnly}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-neutral-50 disabled:text-neutral-500 ${
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
              disabled={isReviewOnly}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-neutral-50 disabled:text-neutral-500"
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
              required
              aria-required="true"
              min={0}
              max={100}
              step={0.1}
              value={abv}
              onChange={(event) => {
                setAbv(event.target.value)
                setErrors((prev) => ({ ...prev, abv: undefined }))
              }}
              disabled={isReviewOnly}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-neutral-50 disabled:text-neutral-500 ${
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
              required
              aria-required="true"
              min={1}
              max={100000}
              value={volumeMl}
              onChange={(event) => {
                setVolumeMl(event.target.value)
                setErrors((prev) => ({ ...prev, volumeMl: undefined }))
              }}
              disabled={isReviewOnly}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-neutral-50 disabled:text-neutral-500 ${
                errors.volumeMl ? 'border-red-400' : 'border-neutral-300'
              }`}
            />
            {errors.volumeMl && <p className="mt-1 text-xs text-red-500">{errors.volumeMl}</p>}
          </div>
        </div>

        <textarea
          value={requestMemo}
          onChange={(event) => setRequestMemo(event.target.value)}
          rows={3}
          maxLength={500}
          disabled={isReviewOnly}
          placeholder={t('review.addEditionMemoPlaceholder')}
          className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-neutral-50 disabled:text-neutral-500"
        />

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
          aromaNote={EMPTY_AROMA_NOTES}
          onAromaNoteChange={() => {}}
        />
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
          aromaNote={EMPTY_AROMA_NOTES}
          onAromaNoteChange={() => {}}
        />
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
          aromaNote={EMPTY_AROMA_NOTES}
          onAromaNoteChange={() => {}}
        />

        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3 md:flex-col md:justify-center">
            <p className="text-xs font-medium text-neutral-600">{t('review.totalPreview')}</p>
            <span className="text-3xl font-bold tabular-nums text-primary-900">{totalPreview.toFixed(1)}</span>
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder={t('review.overallPlaceholder')}
            className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm" isLoading={isLoading}>
            {isReviewOnly ? t('mypage.reviews.rejectedResubmit') : t('mypage.reviews.pendingSave')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
