import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { socialApi } from '@/domain/social/api/socialApi'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import Spinner from '@/shared/components/Spinner'
import ImageLightbox from '@/shared/components/ImageLightbox'
import { stripLocalePrefix } from '@/domain/spirit/utils/spiritUrl'
import { getLocalizedNames } from '@/domain/spirit/utils/spiritDisplayName'
import ShareUrlButton from '@/shared/components/ShareUrlButton'
import { useContentTranslation } from '@/domain/translation/hooks/useContentTranslation'
import TranslationAction from '@/domain/translation/components/TranslationAction'
import { shouldOfferContentTranslation } from '@/domain/translation/utils/contentLanguage'

function score(value: number | null) {
  return value == null ? '-' : Number(value).toFixed(1)
}

export default function PublicReviewPage() {
  const { reviewId } = useParams()
  const id = Number(reviewId)
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const contentTranslation = useContentTranslation('REVIEW', id)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-review', id],
    queryFn: () => socialApi.publicReview(id),
    enabled: Number.isFinite(id),
  })

  if (isLoading) {
    return <div className="flex justify-center py-24"><Spinner className="text-primary-800" /></div>
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">{t('social.publicReviewNotFound')}</h1>
        <Link to="/spirits" className="mt-5 inline-block text-sm font-semibold text-primary-800">
          {t('social.goToSpirits')}
        </Link>
      </div>
    )
  }

  const { primaryName: title, secondaryName: subtitle } = getLocalizedNames(
    data.displayNameKo, data.displayNameEn, i18n.language,
  )
  const canonicalPath = isEn ? data.canonicalPathEn : data.canonicalPathKo
  const reviewImages = data.images ?? []
  const reviewImageUrls = reviewImages.map((image) => image.imageUrl)
  const translated = contentTranslation.fields
  const notes = [
    ['nose', data.noseScore, translated?.noseNote ?? data.noseNote],
    ['taste', data.tasteScore, translated?.tasteNote ?? data.tasteNote],
    ['finish', data.finishScore, translated?.finishNote ?? data.finishNote],
  ] as const
  const sourceReviewTexts = [data.noseNote, data.tasteNote, data.finishNote, data.comment]
  const hasTranslatableText = sourceReviewTexts
    .some((value) => !!value?.trim())
  const shouldShowTranslation = hasTranslatableText && shouldOfferContentTranslation(
    sourceReviewTexts,
    contentTranslation.targetLanguage,
  )

  return (
    <>
      <SeoMeta
        title={t('social.publicReviewSeoTitle', { name: title })}
        description={data.comment || t('social.publicReviewSeoDescription', { name: title })}
        canonical={buildCanonical(canonicalPath)}
        ogImage={data.imageUrl || undefined}
        noindex
        locale={isEn ? 'en_US' : 'ko_KR'}
      />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="absolute right-4 top-4 z-10">
            <ShareUrlButton />
          </div>
          <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="flex min-h-80 flex-col items-center justify-center gap-3 bg-neutral-100 p-5">
              {reviewImages.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(0)}
                    aria-label={t('review.images.open', { number: 1 })}
                    className="w-full overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
                  >
                    <img
                      src={reviewImages[0].imageUrl}
                      alt={t('review.images.previewAlt', { number: 1 })}
                      className="aspect-[4/5] max-h-[620px] w-full object-cover"
                    />
                  </button>
                  {reviewImages.length > 1 && (
                    <div className="grid w-full grid-cols-3 gap-2">
                      {reviewImages.map((image, index) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => setLightboxIndex(index)}
                          aria-label={t('review.images.open', { number: index + 1 })}
                          className="overflow-hidden rounded-xl border-2 border-transparent focus-visible:border-primary-700 focus-visible:outline-none"
                        >
                          <img
                            src={image.imageUrl}
                            alt={t('review.images.previewAlt', { number: index + 1 })}
                            className="aspect-[4/5] w-full object-cover"
                            loading={index === 0 ? 'eager' : 'lazy'}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : data.imageUrl ? (
                <img src={data.imageUrl} alt={title} className="max-h-[620px] w-full rounded-2xl object-contain" />
              ) : (
                <span className="text-sm text-neutral-400">{t('social.noImage')}</span>
              )}
            </div>
            <div className="p-6 sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
                {t('social.publicReviewLabel')}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                <span>{t('social.reviewBy', { nickname: data.nickname })}</span>
                <span aria-hidden>·</span>
                <time>{new Date(data.createdAt).toLocaleDateString(isEn ? 'en-US' : 'ko-KR')}</time>
                <strong className="ml-auto rounded-full bg-primary-50 px-3 py-1 text-primary-800">
                  {t('social.totalScore', { score: score(data.totalScore) })}
                </strong>
              </div>

              <div className="mt-7 space-y-4">
                {notes.map(([key, value, note]) => (
                  <section key={key} className="rounded-2xl bg-neutral-50 p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-neutral-900">{t(`social.reviewField.${key}`)}</h2>
                      <span className="text-sm font-bold text-primary-800">{score(value)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                      {note || t('social.noReviewText')}
                    </p>
                  </section>
                ))}
                <section className="rounded-2xl border border-neutral-200 p-4">
                  <h2 className="font-bold text-neutral-900">{t('social.reviewField.overall')}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                    {translated?.comment || data.comment || t('social.noReviewText')}
                  </p>
                </section>
                <TranslationAction
                  hasContent={shouldShowTranslation}
                  showTranslated={contentTranslation.showTranslated}
                  isLoading={contentTranslation.isLoading}
                  error={contentTranslation.error}
                  onToggle={contentTranslation.toggle}
                />
              </div>

              <Link
                to={stripLocalePrefix(canonicalPath)}
                className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-primary-800 px-5 py-3 text-sm font-bold text-white hover:bg-primary-900"
              >
                {t('social.viewSpirit')}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <ImageLightbox
        images={reviewImageUrls}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex != null}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  )
}
