import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import Spinner from '@/shared/components/Spinner'
import Breadcrumb from '@/shared/components/Breadcrumb'
import { buildCanonical } from '@/shared/config/site'
import { useVenueCountries } from '@/domain/venue/hooks/useVenues'
import { venueCountryLabelKey } from '@/domain/venue/utils/venueLabels'
import { VENUE_FEATURE_ENABLED } from '@/domain/venue/config/venueFeature'
import NotFoundPage from '@/views-spa/NotFoundPage'

/**
 * 장소 허브 — 국가·도시 목록.
 *
 * <p>지도 앱({@code /venue-map})과 역할이 다르다. 이쪽은 <b>색인되는 문서</b>라
 * 검색 유입을 받고, 지도는 탐색을 맡는다. 그래서 여기서는 URL 에 화면 상태를 싣지 않는다 —
 * canonical 자산에 변형 주소를 만들지 않기 위해서다(생산자 상세와 같은 규칙).
 */
export default function VenueHubPage() {
  const { t, i18n } = useTranslation()
  const { data: countries, isLoading } = useVenueCountries()
  const lang = i18n.language === 'en' ? 'en' : 'ko'

  if (!VENUE_FEATURE_ENABLED) return <NotFoundPage />

  return (
    <div className="user-content-container mx-auto px-4 py-6">
      <SeoMeta
        title={t('venue.hub.title', '주류 장소')}
        description={t('venue.hub.description', '바·리쿼샵을 국가와 도시별로 찾아보세요.')}
        canonical={buildCanonical(`/${lang}/venues`)}
        alternateKo={buildCanonical('/ko/venues')}
        alternateEn={buildCanonical('/en/venues')}
      />

      <Breadcrumb items={[{ label: t('venue.hub.title', '주류 장소') }]} />

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {t('venue.hub.title', '주류 장소')}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t('venue.hub.description', '바·리쿼샵을 국가와 도시별로 찾아보세요.')}
          </p>
        </div>
        <Link
          to="/venue-map"
          className="shrink-0 rounded-lg bg-primary-800 px-4 py-2.5 text-sm font-medium text-white
            hover:bg-primary-900"
        >
          {t('venue.map.openMap', '지도에서 보기')}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : !countries || countries.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-neutral-500">{t('venue.hub.empty', '아직 등록된 장소가 없어요.')}</p>
          <Link
            to="/request/venue"
            className="mt-3 inline-flex min-h-[40px] items-center bg-primary-800 px-4 text-sm
              font-medium text-white hover:bg-primary-900"
          >
            {t('venue.list.suggest', '장소 제보하기')}
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {countries.map((country) => (
            <section key={country.countryCode}>
              <h2 className="mb-2 flex items-baseline gap-2">
                <Link
                  to={`/venues/${country.countryCode}`}
                  className="text-lg font-bold text-neutral-900 hover:underline"
                >
                  {t(venueCountryLabelKey(country.countryCode), country.countryCode.toUpperCase())}
                </Link>
                <span className="text-xs text-neutral-400">
                  {t('venue.hub.countryCount', '장소 {{count}}곳', { count: country.venueCount })}
                </span>
              </h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {country.cities.map((city) => (
                  <li key={city.id}>
                    <Link
                      to={`/venues/${country.countryCode}/${city.slug}`}
                      className="flex min-h-[56px] items-center justify-between gap-2 rounded-xl
                        border border-neutral-200 bg-white px-3 py-2.5 hover:border-primary-300
                        hover:bg-primary-50/40"
                    >
                      <span className="truncate text-sm font-medium text-neutral-800">
                        {lang === 'en' ? city.nameEn : city.nameKo}
                      </span>
                      <span className="shrink-0 text-xs text-neutral-400">{city.venueCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
