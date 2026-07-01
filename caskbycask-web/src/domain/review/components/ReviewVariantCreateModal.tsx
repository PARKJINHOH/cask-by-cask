import { FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'

export interface ReviewVariantDraft {
  variantValue: string
  variantValueEn: string | null
  abv: number
  volumeMl: number
  requestMemo: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (draft: ReviewVariantDraft) => void
  initialDraft?: ReviewVariantDraft | null
}

export default function ReviewVariantCreateModal({
  open,
  onClose,
  onCreated,
  initialDraft,
}: Props) {
  const { t } = useTranslation()
  const [variantValue, setVariantValue] = useState('')
  const [variantValueEn, setVariantValueEn] = useState('')
  const [abv, setAbv] = useState('')
  const [volumeMl, setVolumeMl] = useState('')
  const [requestMemo, setRequestMemo] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const variantValueRef = useRef<HTMLInputElement>(null)
  const abvRef = useRef<HTMLInputElement>(null)
  const volumeMlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setVariantValue(initialDraft?.variantValue ?? '')
      setVariantValueEn(initialDraft?.variantValueEn ?? '')
      setAbv(initialDraft?.abv != null ? String(initialDraft.abv) : '')
      setVolumeMl(initialDraft?.volumeMl != null ? String(initialDraft.volumeMl) : '')
      setRequestMemo(initialDraft?.requestMemo ?? '')
      setFieldErrors({})
    }
  }, [open, initialDraft])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedValue = variantValue.trim()
    const abvValue = Number(abv)
    const volumeValue = Number(volumeMl)
    const nextErrors: Record<string, string> = {}

    if (!trimmedValue) {
      nextErrors.variantValue = t('review.addEditionValueRequired')
    }
    if (!abv.trim() || Number.isNaN(abvValue) || abvValue < 0 || abvValue > 100) {
      nextErrors.abv = t('review.addEditionAbvRequired')
    }
    if (!volumeMl.trim() || Number.isNaN(volumeValue) || volumeValue < 1 || volumeValue > 100000) {
      nextErrors.volumeMl = t('review.addEditionVolumeRequired')
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.variantValue) variantValueRef.current?.focus()
      else if (nextErrors.abv) abvRef.current?.focus()
      else if (nextErrors.volumeMl) volumeMlRef.current?.focus()
      return
    }

    onCreated({
      variantValue: trimmedValue,
      variantValueEn: variantValueEn.trim() || null,
      abv: Math.round(abvValue * 10) / 10,
      volumeMl: Math.round(volumeValue),
      requestMemo: requestMemo.trim() || null,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('review.addEditionTitle')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          {t('review.addEditionApprovalNotice')}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
          <label className="flex items-center text-xs font-semibold text-neutral-700 mb-1.5">
            {t('review.addEditionValueKoLabel')} <span className="text-red-500 ml-0.5">*</span>
            <span
              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-500"
              title={t('review.addEditionValueKoTooltip')}
              aria-label={t('review.addEditionValueKoTooltip')}
            >
              ?
            </span>
          </label>
          <input
            ref={variantValueRef}
            type="text"
            value={variantValue}
            onChange={(e) => {
              setVariantValue(e.target.value)
              setFieldErrors((prev) => ({ ...prev, variantValue: '' }))
            }}
            maxLength={100}
            placeholder={t('review.addEditionValueKoPlaceholder')}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
              fieldErrors.variantValue ? 'border-red-400' : 'border-neutral-300'
            }`}
          />
          {fieldErrors.variantValue && <p className="mt-1 text-xs text-red-500">{fieldErrors.variantValue}</p>}
          </div>

          <div>
          <label className="flex items-center text-xs font-semibold text-neutral-700 mb-1.5">
            {t('review.addEditionValueEnLabel')}
            <span className="ml-1 text-[11px] font-normal text-neutral-400">({t('review.optional')})</span>
            <span
              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-500"
              title={t('review.addEditionValueEnTooltip')}
              aria-label={t('review.addEditionValueEnTooltip')}
            >
              ?
            </span>
          </label>
          <input
            type="text"
            value={variantValueEn}
            onChange={(e) => setVariantValueEn(e.target.value)}
            maxLength={100}
            placeholder={t('review.addEditionValueEnPlaceholder')}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="flex items-center text-xs font-semibold text-neutral-700 mb-1.5">
              {t('review.addEditionAbvLabel')} <span className="text-red-500 ml-0.5">*</span>
              <span
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-500"
                title={t('review.addEditionAbvTooltip')}
                aria-label={t('review.addEditionAbvTooltip')}
              >
                ?
              </span>
            </label>
            <input
              ref={abvRef}
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={abv}
              onChange={(e) => {
                setAbv(e.target.value)
                setFieldErrors((prev) => ({ ...prev, abv: '' }))
              }}
              placeholder={t('review.addEditionAbvPlaceholder')}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                fieldErrors.abv ? 'border-red-400' : 'border-neutral-300'
              }`}
            />
            {fieldErrors.abv && <p className="mt-1 text-xs text-red-500">{fieldErrors.abv}</p>}
          </div>

          <div>
            <label className="flex items-center text-xs font-semibold text-neutral-700 mb-1.5">
              {t('review.addEditionVolumeLabel')} <span className="text-red-500 ml-0.5">*</span>
              <span
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-500"
                title={t('review.addEditionVolumeTooltip')}
                aria-label={t('review.addEditionVolumeTooltip')}
              >
                ?
              </span>
            </label>
            <input
              ref={volumeMlRef}
              type="number"
              min={1}
              max={100000}
              step={1}
              value={volumeMl}
              onChange={(e) => {
                setVolumeMl(e.target.value)
                setFieldErrors((prev) => ({ ...prev, volumeMl: '' }))
              }}
              placeholder={t('review.addEditionVolumePlaceholder')}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                fieldErrors.volumeMl ? 'border-red-400' : 'border-neutral-300'
              }`}
            />
            {fieldErrors.volumeMl && <p className="mt-1 text-xs text-red-500">{fieldErrors.volumeMl}</p>}
          </div>
        </div>

        <div>
          <label className="flex items-center text-xs font-semibold text-neutral-700 mb-1.5">
            {t('review.addEditionMemoLabel')}
            <span className="ml-1 text-[11px] font-normal text-neutral-400">({t('review.optional')})</span>
            <span
              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-500"
              title={t('review.addEditionMemoTooltip')}
              aria-label={t('review.addEditionMemoTooltip')}
            >
              ?
            </span>
          </label>
          <textarea
            value={requestMemo}
            onChange={(e) => setRequestMemo(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t('review.addEditionMemoPlaceholder')}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <p className="mt-1 text-right text-xs text-neutral-400">{requestMemo.length}/500</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm">
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
