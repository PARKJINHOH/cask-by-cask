import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import { reviewApi } from '@/domain/review/api/reviewApi'
import type { ReviewEmbedItem } from '@/domain/review/types/review.types'
import type { ReviewEmbedAttrs } from './ReviewEmbed'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (attrs: ReviewEmbedAttrs) => void
}

const PAGE_SIZE = 20

function displayScore(value: number) {
  return Number(value).toFixed(1)
}

export default function ReviewEmbedDialog({ open, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const [reviews, setReviews] = useState<ReviewEmbedItem[]>([])
  const [nextPage, setNextPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const requestSequence = useRef(0)

  const loadPage = useCallback(async (page: number, replace: boolean) => {
    const sequence = ++requestSequence.current
    if (replace) setLoading(true)
    else setLoadingMore(true)
    setError(false)
    try {
      const response = await reviewApi.getMyReviewEmbeds({ page, size: PAGE_SIZE })
      if (sequence !== requestSequence.current) return
      const data = response.data.data
      const content = data?.content ?? []
      setReviews((current) => replace ? content : [...current, ...content])
      setNextPage(page + 1)
      setHasMore(data ? !data.last : false)
    } catch {
      if (sequence === requestSequence.current) setError(true)
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) {
      requestSequence.current += 1
      return
    }
    setReviews([])
    setNextPage(0)
    setHasMore(false)
    void loadPage(0, true)
  }, [open, loadPage])

  const localizedNames = (review: ReviewEmbedItem) => {
    const isEn = i18n.language === 'en'
    const primaryName = isEn
      ? (review.spiritNameEn || review.spiritNameKo)
      : review.spiritNameKo
    const secondaryName = isEn
      ? review.spiritNameKo
      : (review.spiritNameEn || review.spiritNameKo)
    const primaryIdentifier = isEn
      ? (review.spiritIdentifierEn || review.spiritIdentifierKo)
      : review.spiritIdentifierKo
    const secondaryIdentifier = isEn
      ? review.spiritIdentifierKo
      : (review.spiritIdentifierEn || review.spiritIdentifierKo)
    const join = (name: string, identifier: string | null) =>
      identifier ? `${name} — ${identifier}` : name
    return {
      primary: join(primaryName, primaryIdentifier),
      secondary: join(secondaryName, secondaryIdentifier),
    }
  }

  const pick = (review: ReviewEmbedItem) => {
    onSelect({
      reviewId: String(review.id),
      spiritId: String(review.spiritId),
      nameKo: review.spiritNameKo,
      nameEn: review.spiritNameEn || review.spiritNameKo,
      identifierKo: review.spiritIdentifierKo || '',
      identifierEn: review.spiritIdentifierEn || review.spiritIdentifierKo || '',
      abv: review.spiritAbv,
      reviewCount: review.spiritReviewCount,
      noseScore: review.noseScore,
      tasteScore: review.tasteScore,
      finishScore: review.finishScore,
      totalScore: review.totalScore,
      noseNote: review.noseNote || '',
      tasteNote: review.tasteNote || '',
      finishNote: review.finishNote || '',
      comment: review.comment || '',
      width: 100,
    })
    onClose()
  }

  // Headless UI Dialog — 배경 스크롤 잠금 / 포커스 트랩 / ESC 닫기 / aria-modal 을 함께 처리한다.
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center p-4 pt-[8vh]">
        <DialogPanel className="di-review-embed-dialog w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
            <div>
              <DialogTitle className="text-base font-semibold text-neutral-900">
                {t('editor.reviewCard.dialogTitle')}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-neutral-500">
                {t('editor.reviewCard.dialogHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
            >
              ×
            </button>
          </div>

          <div className="max-h-[68vh] overflow-y-auto p-3 sm:p-4">
            {loading && (
              <div className="py-14 text-center text-sm text-neutral-500">
                {t('common.loading')}
              </div>
            )}

            {!loading && error && reviews.length === 0 && (
              <div className="py-14 text-center">
                <p className="text-sm text-neutral-500">{t('editor.reviewCard.loadError')}</p>
                <button
                  type="button"
                  onClick={() => void loadPage(0, true)}
                  className="mt-3 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  {t('editor.reviewCard.retry')}
                </button>
              </div>
            )}

            {!loading && !error && reviews.length === 0 && (
              <div className="py-14 text-center text-sm text-neutral-500">
                {t('editor.reviewCard.empty')}
              </div>
            )}

            {reviews.length > 0 && (
              <div className="space-y-2">
                {reviews.map((review) => {
                  const names = localizedNames(review)
                  return (
                    <button
                      key={review.id}
                      type="button"
                      onClick={() => pick(review)}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/40"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-neutral-900">
                            {names.primary}
                          </span>
                          {names.secondary !== names.primary && (
                            <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
                              {names.secondary}
                            </span>
                          )}
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                            {review.spiritAbv != null && (
                              <span>{t('editor.reviewCard.abv', { value: review.spiritAbv })}</span>
                            )}
                            <span>{t('editor.reviewCard.reviewCount', { count: review.spiritReviewCount })}</span>
                          </span>
                        </span>
                        <span className="shrink-0 rounded-lg bg-primary-100 px-2.5 py-1 text-sm font-bold tabular-nums text-primary-900">
                          {displayScore(review.totalScore)}
                        </span>
                      </span>
                      <span className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-neutral-500">
                        <span>{t('editor.reviewCard.nose')} {displayScore(review.noseScore)}</span>
                        <span>{t('editor.reviewCard.taste')} {displayScore(review.tasteScore)}</span>
                        <span>{t('editor.reviewCard.finish')} {displayScore(review.finishScore)}</span>
                      </span>
                      <span className="mt-2 block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-neutral-600">
                        {review.comment || review.noseNote || t('editor.reviewCard.noNote')}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {error && reviews.length > 0 && (
              <p className="mt-3 text-center text-xs text-danger-600">
                {t('editor.reviewCard.loadError')}
              </p>
            )}

            {hasMore && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadPage(nextPage, false)}
                className="mt-4 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                {loadingMore ? t('common.loading') : t('editor.reviewCard.loadMore')}
              </button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
