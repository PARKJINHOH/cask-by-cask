import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import Spinner from '@/shared/components/Spinner'
import Breadcrumb from '@/shared/components/Breadcrumb'
import { buildCanonical } from '@/shared/config/site'
import VenueDetailPanel from '@/domain/venue/components/VenueDetailPanel'
import { useVenueCountries, useVenueDetail } from '@/domain/venue/hooks/useVenues'
import { venueCountryLabelKey } from '@/domain/venue/utils/venueLabels'
import { venueDisplayName } from '@/domain/venue/types/venue.types'
import { VENUE_FEATURE_ENABLED } from '@/domain/venue/config/venueFeature'
import NotFoundPage from '@/views-spa/NotFoundPage'

/**
 * {@code /venues/:segment} — 국가 목록이거나 장소 상세다.
 *
 * <p>두 주소가 세그먼트 수가 같아 라우터로는 가를 수 없다. 형태로 가른다 —
 * 국가 코드는 영문 2자, 장소 id 는 숫자다(숫자로 된 ISO 국가 코드는 없다).
 * 이 판정은 {@code seoHelpers.parsePath} 의 서버 쪽 분기와 <b>같은 규칙</b>이어야 하며,
 * {@code scripts/venue-route.test.mjs} 가 둘이 어긋나지 않는지 고정한다.
 */
export default function VenueBrowsePage() {
  const { segment = '' } = useParams()
  if (/^\d+$/.test(segment)) return <VenueDocumentPage venueId={Number(segment)} />
  if (/^[a-z]{2}$/i.test(segment)) return <VenueCountryPage countryCode={segment.toLowerCase()} />
  return <NotFoundPage />
}

// ── 장소 상세 문서 ────────────────────────────────────────

function VenueDocumentPage({ venueId }: { venueId: number }) {
  const { t, i18n } = useTranslation()
  const { data: detail, isLoading, isError } = useVenueDetail(venueId)
  const lang = i18n.language === 'en' ? 'en' : 'ko'

  if (!VENUE_FEATURE_ENABLED || isError) return <NotFoundPage />
  if (isLoading || !detail) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  }

  const venue = detail.summary
  const name = venueDisplayName(venue, lang)
  const cityName = lang === 'en' ? venue.cityNameEn : venue.cityNameKo
  const path = `/venues/${venue.id}`
  const description = [name, cityName, venue.address].filter(Boolean).join(' · ')

  return (
    <div className="user-content-container mx-auto px-4 py-6">
      <SeoMeta
        title={`${name} — ${cityName}`}
        description={description}
        canonical={buildCanonical(`/${lang}${path}`)}
        alternateKo={buildCanonical(`/ko${path}`)}
        alternateEn={buildCanonical(`/en${path}`)}
        jsonLd={buildVenueJsonLd(detail, name, buildCanonical(`/${lang}${path}`))}
      />

      <Breadcrumb
        items={[
          { label: t('venue.hub.title', '주류 장소'), to: '/venues' },
          { label: cityName, to: `/venues/${venue.countryCode}/${venue.citySlug}` },
          { label: name },
        ]}
      />

      <div className="mt-3 flex justify-end">
        <Link
          to={`/venue-map?country=${venue.countryCode}&city=${venue.citySlug}&venue=${venue.id}`}
          className="rounded-lg bg-primary-800 px-4 py-2.5 text-sm font-medium text-white
            hover:bg-primary-900"
        >
          {t('venue.map.openMap', '지도에서 보기')}
        </Link>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {/* 지도 앱 패널과 같은 알맹이를 쓴다 — 두 곳에서 각각 그리면 반드시 어긋난다. */}
        <VenueDetailPanel
          venueId={venue.id}
          fallbackSummary={venue}
          showFullPageLink={false}
          variant="document"
        />
      </div>
    </div>
  )
}

/**
 * LocalBusiness 계열 구조화 데이터.
 *
 * <p><b>aggregateRating·review·priceRange·openingHoursSpecification 은 넣지 않는다.</b>
 * 장소에는 평점이 없고, 방문 후기는 schema.org 의 Review 가 아니며, 영업시간은 비구조 텍스트다.
 * 근거 없는 리치 마크업은 구조화 데이터 정책 위반이다 — 리뷰 0건 주류에 aggregateRating 을
 * 붙이지 않는 기존 판단(seoSchema.ts)과 같은 기준이다.
 */
function buildVenueJsonLd(
  detail: ReturnType<typeof useVenueDetail>['data'],
  name: string,
  url: string,
) {
  if (!detail) return undefined
  const venue = detail.summary
  // 유형 → schema.org 타입. BAR 은 BarOrPub, 리쿼샵은 LiquorStore 가 정확한 대응이다.
  const type =
    venue.venueType === 'BOTTLE_SHOP'
      ? 'LiquorStore'
      : venue.venueType === 'OTHER'
        ? 'LocalBusiness'
        : 'BarOrPub'

  const sameAs = [detail.website, detail.instagramUrl].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    url,
    address: {
      '@type': 'PostalAddress',
      addressCountry: venue.countryCode.toUpperCase(),
      addressLocality: venue.cityNameEn,
      streetAddress: venue.addressDetail
        ? `${venue.address} ${venue.addressDetail}`
        : venue.address,
    },
    ...(venue.lat != null && venue.lng != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: venue.lat, longitude: venue.lng } }
      : {}),
    ...(detail.phone ? { telephone: detail.phone } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

// ── 국가 문서 ─────────────────────────────────────────────

function VenueCountryPage({ countryCode }: { countryCode: string }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data: countries, isLoading } = useVenueCountries()
  const lang = i18n.language === 'en' ? 'en' : 'ko'

  if (!VENUE_FEATURE_ENABLED) return <NotFoundPage />

  const country = countries?.find((item) => item.countryCode === countryCode)
  const countryName = t(venueCountryLabelKey(countryCode), countryCode.toUpperCase())
  const path = `/venues/${countryCode}`

  return (
    <div className="user-content-container mx-auto px-4 py-6">
      <SeoMeta
        title={`${countryName} ${t('venue.hub.title', '주류 장소')}`}
        description={t('venue.hub.description', '바·리쿼샵을 국가와 도시별로 찾아보세요.')}
        canonical={buildCanonical(`/${lang}${path}`)}
        alternateKo={buildCanonical(`/ko${path}`)}
        alternateEn={buildCanonical(`/en${path}`)}
      />

      <Breadcrumb
        items={[{ label: t('venue.hub.title', '주류 장소'), to: '/venues' }, { label: countryName }]}
      />

      <h1 className="mt-3 text-2xl font-bold text-neutral-900">{countryName}</h1>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : !country || country.cities.length === 0 ? (
        // 장소가 0건이어도 404 로 만들지 않는다 — 색인된 주소를 죽이면 쌓인 순위를 버린다.
        <p className="py-20 text-center text-sm text-neutral-500">
          {t('venue.hub.empty', '아직 등록된 장소가 없어요.')}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {country.cities.map((city) => (
            <li key={city.id}>
              <button
                type="button"
                onClick={() => navigate(`/venues/${countryCode}/${city.slug}`)}
                className="flex min-h-[56px] w-full items-center justify-between gap-2 rounded-xl
                  border border-neutral-200 bg-white px-3 py-2.5 hover:border-primary-300
                  hover:bg-primary-50/40"
              >
                <span className="truncate text-sm font-medium text-neutral-800">
                  {lang === 'en' ? city.nameEn : city.nameKo}
                </span>
                <span className="shrink-0 text-xs text-neutral-400">{city.venueCount}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
