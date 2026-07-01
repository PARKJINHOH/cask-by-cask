import { useTranslation } from 'react-i18next'
import type { ReviewVariantDraft } from './ReviewVariantCreateModal'

interface Props {
  draft: ReviewVariantDraft
  onEdit: () => void
  onDelete: () => void
}

export default function ReviewVariantDraftCard({ draft, onEdit, onDelete }: Props) {
  const { t } = useTranslation()

  return (
    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-amber-100 bg-amber-900 px-3 py-2.5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-100">
            {t('review.addEditionDraftLabel')}
          </p>
          <p className="mt-0.5 text-xs text-amber-50">{t('review.addEditionDraftNotice')}</p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
          >
            {t('common.edit')}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-white/25 bg-white px-2.5 py-1 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-50"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3">
          <p className="text-[11px] font-bold text-amber-900">
            {t('review.addEditionValueKoLabel')}
          </p>
          <p className="mt-1 break-words text-base font-bold leading-snug text-neutral-950">
            {draft.variantValue}
          </p>
          {draft.variantValueEn && (
            <div className="mt-2 border-t border-amber-100 pt-2">
              <p className="text-[11px] font-semibold text-neutral-500">
                {t('review.addEditionValueEnLabel')}
              </p>
              <p className="mt-0.5 break-words text-sm font-medium text-neutral-700">
                {draft.variantValueEn}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-neutral-500">
              {t('review.addEditionAbvLabel')}
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-neutral-900">
              {draft.abv}%
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-neutral-500">
              {t('review.addEditionVolumeLabel')}
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-neutral-900">
              {draft.volumeMl}ml
            </p>
          </div>
        </div>
      </div>

      {draft.requestMemo && (
        <div className="border-t border-neutral-100 bg-neutral-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-neutral-500">
            {t('review.addEditionMemoLabel')}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-neutral-700">
            {draft.requestMemo}
          </p>
        </div>
      )}
    </section>
  )
}
