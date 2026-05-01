import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSpiritDetail } from '@/domain/spirit/hooks/useSpiritDetail'
import { useReviews } from '@/domain/review/hooks/useReviews'
import Spinner from '@/shared/components/Spinner'
import Badge from '@/shared/components/Badge'

export default function SpiritDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const spiritId = Number(id)

  const { data: spirit, isLoading } = useSpiritDetail(spiritId)
  const { data: reviews } = useReviews(spiritId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    )
  }

  if (!spirit) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-400">{t('common.noData')}</p>
        <Link to="/" className="mt-4 inline-block text-primary-600 hover:underline">
          {t('common.back')}
        </Link>
      </div>
    )
  }

  const primaryImage = spirit.images.find((img) => img.isPrimary) ?? spirit.images[0]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-neutral-400 hover:text-primary-600 mb-6 inline-block">
        ← {t('common.back')}
      </Link>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="md:flex">
          <div className="md:w-72 aspect-square bg-neutral-100 flex-shrink-0">
            {primaryImage ? (
              <img
                src={primaryImage.imageUrl}
                alt={spirit.nameKo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">🥃</div>
            )}
          </div>

          <div className="p-6 flex-1">
            <Badge variant="primary" className="mb-3">
              {t(`spirit.category.${spirit.category.toLowerCase()}`)}
            </Badge>
            <h1 className="text-2xl font-bold text-neutral-900">{spirit.nameKo}</h1>
            <p className="text-neutral-500 mt-1">{spirit.nameEn}</p>

            {spirit.distilleryNameKo && (
              <p className="text-sm text-neutral-500 mt-2">
                {spirit.distilleryNameKo}
                {spirit.distilleryNameEn && ` · ${spirit.distilleryNameEn}`}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-3 mt-6">
              {spirit.country && (
                <div>
                  <dt className="text-xs text-neutral-400">국가</dt>
                  <dd className="text-sm font-medium">{spirit.country}</dd>
                </div>
              )}
              {spirit.abv != null && (
                <div>
                  <dt className="text-xs text-neutral-400">도수</dt>
                  <dd className="text-sm font-medium">{spirit.abv}%</dd>
                </div>
              )}
              {spirit.volumeMl && (
                <div>
                  <dt className="text-xs text-neutral-400">용량</dt>
                  <dd className="text-sm font-medium">{spirit.volumeMl}ml</dd>
                </div>
              )}
              {spirit.bottledYear && (
                <div>
                  <dt className="text-xs text-neutral-400">병입 연도</dt>
                  <dd className="text-sm font-medium">{spirit.bottledYear}</dd>
                </div>
              )}
            </dl>

            {spirit.avgScore != null && (
              <div className="mt-6 flex items-center gap-2">
                <span className="text-3xl font-bold text-primary-600">
                  {spirit.avgScore.toFixed(1)}
                </span>
                <div>
                  <p className="text-xs text-neutral-400">평균 점수</p>
                  <p className="text-xs text-neutral-400">{spirit.reviewCount}개 리뷰</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('review.title')}</h2>
        {!reviews || reviews.empty ? (
          <p className="text-neutral-400 text-sm">{t('review.noReview')}</p>
        ) : (
          <div className="space-y-4">
            {reviews.content.map((review) => (
              <div key={review.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{review.nickname}</span>
                  <span className="text-lg font-bold text-primary-600">
                    {review.totalScore.toFixed(1)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-neutral-500 mb-2">
                  <span>향 {review.noseScore}</span>
                  <span>맛 {review.tasteScore}</span>
                  <span>피니시 {review.finishScore}</span>
                </div>
                {review.comment && (
                  <p className="text-sm text-neutral-700">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
