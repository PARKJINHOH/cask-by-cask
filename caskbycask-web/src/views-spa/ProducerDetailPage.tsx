import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useProducerDetail } from '@/domain/producer/hooks/useProducer'
import { PRODUCER_TYPE_LABEL } from '@/domain/producer/types/producer.types'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import SpiritCard from '@/shared/components/SpiritCard'
import Spinner from '@/shared/components/Spinner'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import WineOriginMap from '@/domain/location/components/WineOriginMap'
import { hasWineRegionMap } from '@/domain/location/data/wineRegionMap'
import { localizeCountry } from '@/shared/utils/countryName'
import { localizeRegion } from '@/shared/utils/regionName'

export default function ProducerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const producerId = Number(id)
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const { data: producer, isLoading } = useProducerDetail(producerId)

  const { data: spiritsPage } = useQuery({
    queryKey: ['producer', producerId, 'spirits'],
    queryFn: () => spiritApi.search({ producerId, size: 24 }).then((r) => r.data.data!),
    enabled: producerId > 0,
    staleTime: 60_000,
  })

  if (isLoading) return <Spinner fullscreen />

  if (!producer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-500">{t('producerDetail.notFound')}</p>
      </div>
    )
  }

  const primaryName   = isEn ? (producer.nameEn || producer.nameKo) : producer.nameKo
  const secondaryName = isEn ? producer.nameKo : producer.nameEn
  const typeLabel     = isEn ? PRODUCER_TYPE_LABEL[producer.type].en : PRODUCER_TYPE_LABEL[producer.type].ko
  const countryLabel  = localizeCountry(producer.country, i18n.language)
  const regionLabel   = producer.region ? localizeRegion(producer.region, i18n.language) : null
  const description   = isEn ? (producer.descriptionEn || producer.descriptionKo) : (producer.descriptionKo || producer.descriptionEn)
  const spirits       = spiritsPage?.content ?? []
  // 산지 지도는 기하 데이터가 있는 국가에서만 — 없으면 정보 카드가 가로 전체를 쓴다
  const wineRegion    = producer.wineRegion
  const showMap       = !!wineRegion && hasWineRegionMap(wineRegion.countryCode)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <SeoMeta
        title={primaryName}
        description={isEn
          ? `${primaryName} — ${typeLabel} in ${countryLabel}. Spirits and reviews on CaskByCask.`
          : `${primaryName} — ${countryLabel} ${typeLabel}. CaskByCask에서 이 생산자의 술과 리뷰를 확인하세요.`}
        canonical={buildCanonical(`/${isEn ? 'en' : 'ko'}/producers/${producer.id}`)}
        alternateKo={buildCanonical(`/ko/producers/${producer.id}`)}
        alternateEn={buildCanonical(`/en/producers/${producer.id}`)}
        locale={isEn ? 'en_US' : 'ko_KR'}
      />

      {/* 생산자 정보 + 산지 지도 — PC 에서는 좌우 2분할, 모바일에서는 세로 배치 */}
      <div className={`mb-8 ${showMap
        ? 'grid grid-cols-1 gap-4 items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-6'
        : ''}`}>
        {/* 생산자 정보 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 20h20M4 20V8l6 4V8l6 4V8l4 3v9" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-neutral-900">{primaryName}</h1>
                <span className="inline-flex items-center text-xs font-medium text-amber-700
                  bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                  {typeLabel}
                </span>
              </div>
              {secondaryName && <p className="text-sm text-neutral-400 mt-0.5">{secondaryName}</p>}

              <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500 flex-wrap">
                {countryLabel && (
                  <span>{countryLabel}{regionLabel ? ` · ${regionLabel}` : ''}</span>
                )}
                {producer.foundedYear && (
                  <span>{t('producerDetail.founded')}: {producer.foundedYear}</span>
                )}
                {producer.website && (
                  <a href={producer.website} target="_blank" rel="noopener noreferrer"
                    className="text-primary-800 hover:underline inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    {t('producerDetail.website')}
                  </a>
                )}
              </div>

              {description && (
                <p className="mt-4 text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{description}</p>
              )}
            </div>
          </div>
        </div>

        {/* 산지 지도 — 주류 상세와 같은 컴포넌트 (국가 › 산지 › 세부 산지) */}
        {showMap && (
          <WineOriginMap
            key={producer.id}
            wineRegion={wineRegion}
            countryLabel={countryLabel}
          />
        )}
      </div>

      {/* 이 생산자의 술 */}
      <section>
        <h2 className="text-base font-bold text-neutral-900 mb-4">
          {t('producerDetail.otherSpirits')}
          {spirits.length > 0 && <span className="ml-1.5 text-sm font-normal text-neutral-400">({spirits.length})</span>}
        </h2>
        {spirits.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-neutral-200 py-12 text-center">
            <p className="text-sm text-neutral-400">{t('producerDetail.empty')}</p>
          </div>
        ) : (
          /* 카드 폭을 고정 상한으로 잡아 화면이 넓어질수록 카드가 커지지 않고 열 수만 늘어난다 */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))]
            sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 lg:gap-4">
            {spirits.map((s) => (
              <SpiritCard key={s.id} spirit={s} imageFit="contain" uniformTwoLineName />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
