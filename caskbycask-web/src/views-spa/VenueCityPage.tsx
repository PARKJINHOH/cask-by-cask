import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import Spinner from '@/shared/components/Spinner'
import Breadcrumb from '@/shared/components/Breadcrumb'
import { buildCanonical } from '@/shared/config/site'
import VenueListPanel from '@/domain/venue/components/VenueListPanel'
import { useVenueCity } from '@/domain/venue/hooks/useVenues'
import { venueCountryLabelKey } from '@/domain/venue/utils/venueLabels'
import { VENUE_FEATURE_ENABLED } from '@/domain/venue/config/venueFeature'
import NotFoundPage from '@/views-spa/NotFoundPage'

/**
 * 도시 문서 페이지 — "오사카 위스키바" 같은 검색이 닿는 자리.
 *
 * <p>지도를 여기 박지 않는다. 이 화면의 일은 <b>목록을 크롤 가능한 형태로 두는 것</b>이고,
 * 지도를 원하는 사용자는 상단 버튼으로 앱({@code /venue-map})으로 간다.
 * 문서마다 maplibre 를 끌어오면 색인 페이지의 첫 로딩이 무거워진다.
 */
export default function VenueCityPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { countryCode = '', citySlug = '' } = useParams()
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const lang = i18n.language === 'en' ? 'en' : 'ko'

  const { data, isLoading, isError } = useVenueCity(countryCode, citySlug)

  if (!VENUE_FEATURE_ENABLED || isError) return <NotFoundPage />

  const cityName = data ? (lang === 'en' ? data.city.nameEn : data.city.nameKo) : citySlug
  const countryName = t(venueCountryLabelKey(countryCode), countryCode.toUpperCase())
  const path = `/venues/${countryCode}/${citySlug}`

  return (
    <div className="user-content-container mx-auto px-4 py-6">
      <SeoMeta
        title={`${cityName} ${t('venue.hub.title', '주류 장소')}`}
        description={t('venue.hub.description', '바·리쿼샵을 국가와 도시별로 찾아보세요.')}
        canonical={buildCanonical(`/${lang}${path}`)}
        alternateKo={buildCanonical(`/ko${path}`)}
        alternateEn={buildCanonical(`/en${path}`)}
      />

      <Breadcrumb
        items={[
          { label: t('venue.hub.title', '주류 장소'), to: '/venues' },
          { label: countryName, to: `/venues/${countryCode}` },
          { label: cityName },
        ]}
      />

      <div className="mt-3 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">
          {cityName}
          <span className="ml-2 text-sm font-normal text-neutral-400">
            {data?.venues.length ?? 0}
          </span>
        </h1>
        <Link
          to={`/venue-map?country=${countryCode}&city=${citySlug}`}
          className="shrink-0 rounded-lg bg-primary-800 px-4 py-2.5 text-sm font-medium text-white
            hover:bg-primary-900"
        >
          {t('venue.map.openMap', '지도에서 보기')}
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <VenueListPanel
            venues={data?.venues ?? []}
            selectedId={null}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={(id) => navigate(`/venues/${id}`)}
          />
        )}
      </div>
    </div>
  )
}
