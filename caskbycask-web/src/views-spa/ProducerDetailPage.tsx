import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useProducerDetail } from '@/domain/producer/hooks/useProducer'
import { PRODUCER_TYPE_LABEL } from '@/domain/producer/types/producer.types'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import SpiritCard from '@/shared/components/SpiritCard'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from '@/shared/hooks/useDebouncedValue'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import WineOriginMap from '@/domain/location/components/WineOriginMap'
import { hasWineRegionMap } from '@/domain/location/data/wineRegionMap'
import { localizeCountry } from '@/shared/utils/countryName'
import { localizeRegion } from '@/shared/utils/regionName'

const SPIRITS_PAGE_SIZE = 24

export default function ProducerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const producerId = Number(id)
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const { data: producer, isLoading } = useProducerDetail(producerId)

  // 술 목록의 페이지·검색어는 URL 이 아니라 화면 상태로 든다 — 이 주소는 canonical·hreflang 을 갖춘
  // SEO 자산이라 ?page=·?q= 를 얹으면 색인 대상 URL 변형이 생긴다.
  const [page, setPage] = useState(0)
  const [keywordInput, setKeywordInput] = useState('')
  const debouncedKeyword = useDebouncedValue(keywordInput, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    setPage(0)
  }, [debouncedKeyword])

  const { data: spiritsPage, isFetching: isSpiritsFetching } = useQuery({
    queryKey: ['producer', producerId, 'spirits', page, debouncedKeyword],
    queryFn: () => spiritApi
      .search({ producerId, keyword: debouncedKeyword || undefined, page, size: SPIRITS_PAGE_SIZE })
      .then((r) => r.data.data!),
    enabled: producerId > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  // 목록의 totalElements 는 페이지 계산용 마스터 수라, 에디션까지 더한 표시용 건수는 따로 받는다.
  const { data: spiritsCount } = useQuery({
    queryKey: ['producer', producerId, 'spirits', 'count', debouncedKeyword],
    queryFn: () => spiritApi
      .count({ producerId, keyword: debouncedKeyword || undefined })
      .then((r) => r.data.data!),
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
  const totalPages    = spiritsPage?.totalPages ?? 0
  const totalCount    = spiritsCount?.totalCount ?? spiritsPage?.totalElements
  const isSearching   = debouncedKeyword.trim().length > 0
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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-neutral-900">
            {t('producerDetail.otherSpirits')}
            {!!totalCount && (
              <span className="ml-1.5 text-sm font-normal text-neutral-400">
                <Trans i18nKey="spirit.count" values={{ n: totalCount }} components={[<span />]} />
              </span>
            )}
          </h2>

          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="relative w-full sm:w-64 flex-shrink-0"
          >
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder={t('review.searchSpiritPlaceholder')}
              aria-label={t('producerDetail.searchAriaLabel')}
              className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-9 text-sm text-neutral-800
                placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100
                [&::-webkit-search-cancel-button]:hidden"
            />
            {keywordInput && (
              <button
                type="button"
                onClick={() => setKeywordInput('')}
                aria-label={t('review.searchClear')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400
                  transition-colors hover:bg-neutral-100 hover:text-neutral-600 cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                  <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </form>
        </div>

        {spirits.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-neutral-200 py-12 text-center">
            <p className="text-sm text-neutral-400">
              {isSearching ? t('producerDetail.noSearchResult') : t('producerDetail.empty')}
            </p>
            {isSearching && (
              <p className="mt-1 text-xs text-neutral-400">{t('producerDetail.noSearchResultDesc')}</p>
            )}
          </div>
        ) : (
          <>
            {/* 카드 폭을 고정 상한으로 잡아 화면이 넓어질수록 카드가 커지지 않고 열 수만 늘어난다 */}
            <div className={`grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))]
              sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 lg:gap-4
              transition-opacity ${isSpiritsFetching ? 'opacity-60' : 'opacity-100'}`}>
              {spirits.map((s) => (
                <SpiritCard key={s.id} spirit={s} imageFit="contain" uniformTwoLineName />
              ))}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              scrollTarget="page"
              className="mt-6"
            />
          </>
        )}
      </section>
    </div>
  )
}
