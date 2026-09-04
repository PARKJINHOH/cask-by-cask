'use client'

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSpiritVenues } from '@/domain/venue/hooks/useSpiritVenues'
import { venueDisplayName } from '@/domain/venue/types/venue.types'
import { venueTypeLabelKey } from '@/domain/venue/utils/venueLabels'
import { VENUE_FEATURE_ENABLED } from '@/domain/venue/config/venueFeature'

interface Props {
  spiritId: number
  className?: string
}

/**
 * 주류 상세의 "이 술을 마실 수 있는 곳".
 *
 * <p>이 기능 전체의 목적이 여기 모인다 — 술을 보러 온 사람을 실제 업소로 보낸다.
 * 목록은 사장님이 관리하는 것이 아니라 <b>리뷰의 "마신 곳" 태그가 쌓여 저절로 만들어진다.</b>
 *
 * <p>비어 있으면 <b>섹션 자체를 그리지 않는다</b>. 태그가 쌓이기 전 몇 주 동안
 * "아직 없어요" 빈 상자가 페이지에 박혀 있으면 그게 더 나쁘다.
 */
export default function SpiritVenueSection({ spiritId, className }: Props) {
  const { t, i18n } = useTranslation()
  const { data: venues } = useSpiritVenues(spiritId, VENUE_FEATURE_ENABLED)

  if (!venues || venues.length === 0) return null

  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            {t('venue.spirit.sectionTitle', '이 술을 마실 수 있는 곳')}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {t('venue.spirit.sectionHint', '리뷰에 남긴 "마신 곳"을 모은 목록이에요.')}
          </p>
        </div>
        <Link
          to="/venue-map"
          className="shrink-0 text-xs text-primary-700 underline hover:text-primary-900"
        >
          {t('venue.spirit.seeAll', '지도에서 보기')}
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {venues.map(({ venue, reviewCount }) => (
          <li key={venue.id}>
            <Link
              to={`/venues/${venue.id}`}
              className="flex min-h-[64px] items-center gap-3 rounded-xl border border-neutral-200
                bg-white px-3 py-2.5 transition-colors hover:border-primary-300 hover:bg-primary-50/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900">
                  {venueDisplayName(venue, i18n.language)}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5">
                    {t(venueTypeLabelKey(venue.venueType), venue.venueType)}
                  </span>
                  <span className="truncate">
                    {i18n.language === 'en' ? venue.cityNameEn : venue.cityNameKo}
                  </span>
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-primary-700">
                {t('venue.spirit.reviewCount', '리뷰 {{count}}건', { count: reviewCount })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
