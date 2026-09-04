'use client'

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Spinner from '@/shared/components/Spinner'
import { venueDisplayName, type VenueSummary } from '@/domain/venue/types/venue.types'
import { venueTypeLabelKey } from '@/domain/venue/utils/venueLabels'

interface Props {
  venues: VenueSummary[]
  isLoading?: boolean
  selectedId: number | null
  hoveredId: number | null
  onSelect: (id: number) => void
  onHover: (id: number | null) => void
  /** 필터가 걸려 결과가 0건인지 — 빈 상태 문구가 달라진다 */
  filtered?: boolean
  onResetFilter?: () => void
  className?: string
}

/**
 * 장소 목록 — <b>지도의 접근 가능한 등가물</b>이다.
 *
 * <p>지도는 본질적으로 키보드로 다룰 수 없다. 그래서 같은 정보를 담은 이 목록이
 * 키보드로 순회 가능해야 하고(각 항목이 버튼), 스크린 리더에도 읽혀야 한다.
 * WebGL 을 못 쓰는 환경에서는 이 목록만으로 화면이 완결된다.
 */
export default function VenueListPanel({
  venues,
  isLoading,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  filtered,
  onResetFilter,
  className,
}: Props) {
  const { t, i18n } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (venues.length === 0) {
    return (
      <div className={`px-6 py-16 text-center ${className ?? ''}`}>
        <p className="text-sm text-neutral-500">
          {filtered
            ? t('venue.list.emptyFiltered', '조건에 맞는 장소가 없어요.')
            : t('venue.list.empty', '아직 등록된 장소가 없어요.')}
        </p>
        {filtered && onResetFilter ? (
          <button
            type="button"
            onClick={onResetFilter}
            className="mt-3 min-h-[40px] border border-neutral-300 px-4 text-sm text-neutral-700
              hover:bg-neutral-50"
          >
            {t('venue.list.resetFilter', '필터 초기화')}
          </button>
        ) : (
          <Link
            to="/request/venue"
            className="mt-3 inline-flex min-h-[40px] items-center bg-primary-800 px-4 text-sm
              font-medium text-white hover:bg-primary-900"
          >
            {t('venue.list.suggest', '장소 제보하기')}
          </Link>
        )}
      </div>
    )
  }

  return (
    <ul className={className}>
      {venues.map((venue) => {
        const active = venue.id === selectedId
        const hovered = venue.id === hoveredId
        return (
          <li key={venue.id} className="border-b border-neutral-100 last:border-b-0">
            <button
              type="button"
              onClick={() => onSelect(venue.id)}
              onMouseEnter={() => onHover(venue.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(venue.id)}
              onBlur={() => onHover(null)}
              aria-current={active ? 'true' : undefined}
              /* 선택은 배경이 아니라 왼쪽 띠로 표시한다 — 배경만 칠하면 hover 와 구분이 안 되고,
                 스크롤하며 훑을 때 어디가 선택인지 눈이 못 따라간다. */
              className={`relative flex w-full flex-col gap-1.5 py-3.5 pl-4 pr-4 text-left
                transition-colors before:absolute before:inset-y-0 before:left-0 before:w-[3px]
                before:transition-colors ${
                  active
                    ? 'bg-primary-50/60 before:bg-primary-700'
                    : hovered
                      ? 'bg-neutral-50 before:bg-transparent'
                      : 'before:bg-transparent hover:bg-neutral-50'
                }`}
            >
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate text-[15px] font-semibold leading-tight text-neutral-900">
                  {venueDisplayName(venue, i18n.language)}
                </span>
                {venue.nameLocal && (
                  <span className="shrink-0 truncate text-xs text-neutral-400">{venue.nameLocal}</span>
                )}
                {venue.status === 'CLOSED' && (
                  <span className="ml-auto shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-px text-[11px] text-amber-700">
                    {t('venue.status.closed', '폐업')}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
                {/* 종류는 색이 아니라 글자로 전한다 — 지도 마커는 색을 쓰지 않는다 */}
                <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
                  {t(venueTypeLabelKey(venue.venueType), venue.venueType)}
                </span>
                <span className="truncate">{venue.address}</span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
