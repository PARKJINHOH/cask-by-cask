import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import SeoMeta from '@/shared/components/SeoMeta'
import VenueListPanel from '@/domain/venue/components/VenueListPanel'
import VenueDetailPanel from '@/domain/venue/components/VenueDetailPanel'
import VenueBottomSheet, { type SheetSnap } from '@/domain/venue/components/VenueBottomSheet'
import VenueCountrySelect from '@/domain/venue/components/VenueCountrySelect'
import { useVenueCity, useVenueCountries } from '@/domain/venue/hooks/useVenues'
import { FALLBACK_CENTER, FALLBACK_ZOOM } from '@/domain/venue/config/mapTiles'
import { VENUE_TYPES, venueDisplayName, type VenueType } from '@/domain/venue/types/venue.types'
import { venueTypeLabelKey } from '@/domain/venue/utils/venueLabels'

// 지도는 이 라우트에서만 쓰인다 — 다른 라우트의 번들에 maplibre 가 새지 않도록 여기서 자른다.
const VenueMap = lazy(() => import('@/domain/venue/components/VenueMap'))

/** 마지막으로 본 도시. 빈 세계 지도로 시작하지 않기 위한 최소한의 기억. */
const LAST_CITY_KEY = 'cbc_venue_city'
/** 데스크톱 좌측 패널 폭 — 지도의 시야 중심을 이만큼 밀어 준다. */
const PANEL_WIDTH = 380

function readLastCity(): { country: string; city: string } | null {
  try {
    const raw = localStorage.getItem(LAST_CITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed?.country === 'string' && typeof parsed?.city === 'string' ? parsed : null
  } catch {
    // 사생활 보호 모드·저장소 차단 환경에서는 그냥 기본값으로 간다.
    return null
  }
}

function writeLastCity(country: string, city: string) {
  try {
    localStorage.setItem(LAST_CITY_KEY, JSON.stringify({ country, city }))
  } catch {
    /* 저장 실패는 무시한다 — 편의 기능이다 */
  }
}

/**
 * 주류 장소 지도 — 전체화면 앱.
 *
 * <p>포토카드 편집기와 같은 {@code EditorLayout} 위에 산다. GNB·푸터가 없고 스크롤이 잠겨 있어
 * 지도 앱에 맞는 껍데기다({@code 100dvh} 라 모바일 주소창이 접혀도 하단 시트가 밀리지 않는다).
 *
 * <p>이 페이지는 <b>noindex</b> 다. 검색 유입은 {@code /venues/*} 문서 페이지가 맡고,
 * 여기는 탐색·비교를 맡는다. 그래서 반대로 뷰 상태를 URL 에 적극적으로 싣는다 —
 * 공유했을 때 같은 화면이 열려야 하기 때문이다.
 */
export default function VenueMapPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()

  const [mapState, setMapState] = useState<'ok' | 'unsupported' | 'tile-error'>('ok')
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek')
  const [sheetHeight, setSheetHeight] = useState(128)
  const [clusterIds, setClusterIds] = useState<number[] | null>(null)
  const [keyword, setKeyword] = useState('')
  // Tailwind 의 lg(1024px)와 같은 기준. 패널이 지도를 덮는지(모바일) 옆에 있는지(데스크톱)에 따라
  // 지도 여백 계산이 달라진다.
  const [isDesktop, setIsDesktop] = useState(true)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const { data: countries, isLoading: countriesLoading } = useVenueCountries()

  // 국가·도시 결정: URL > 마지막으로 본 도시 > 첫 번째 도시
  const countryParam = params.get('country')
  const cityParam = params.get('city')
  const selectedId = params.get('venue') ? Number(params.get('venue')) : null
  const typeFilter = (params.get('type') as VenueType | null) ?? null

  const resolved = useMemo(() => {
    if (!countries || countries.length === 0) return null
    if (countryParam && cityParam) return { country: countryParam, city: cityParam }

    const last = readLastCity()
    if (last && countries.some((c) => c.countryCode === last.country
      && c.cities.some((city) => city.slug === last.city))) {
      return last
    }
    const first = countries[0]
    return first.cities[0]
      ? { country: first.countryCode, city: first.cities[0].slug }
      : null
  }, [countries, countryParam, cityParam])

  const { data: cityDetail, isLoading: cityLoading } = useVenueCity(
    resolved?.country ?? null,
    resolved?.city ?? null,
  )

  // URL 에 국가·도시가 없으면 채워 넣는다 — 공유했을 때 같은 화면이 열려야 한다.
  useEffect(() => {
    if (!resolved) return
    if (countryParam === resolved.country && cityParam === resolved.city) return
    const next = new URLSearchParams(params)
    next.set('country', resolved.country)
    next.set('city', resolved.city)
    setParams(next, { replace: true })
  }, [resolved, countryParam, cityParam, params, setParams])

  useEffect(() => {
    if (resolved) writeLastCity(resolved.country, resolved.city)
  }, [resolved])

  const updateParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      setParams(next)
    },
    [params, setParams],
  )

  const allVenues = cityDetail?.venues ?? []
  const visibleVenues = useMemo(() => {
    let list = allVenues
    if (typeFilter) list = list.filter((venue) => venue.venueType === typeFilter)
    if (keyword.trim()) {
      const needle = keyword.trim().toLowerCase()
      list = list.filter(
        (venue) =>
          venue.nameKo.toLowerCase().includes(needle) ||
          (venue.nameEn ?? '').toLowerCase().includes(needle) ||
          (venue.nameLocal ?? '').toLowerCase().includes(needle) ||
          venue.address.toLowerCase().includes(needle),
      )
    }
    // 클러스터를 눌러 그룹을 펼친 상태면 그 그룹만 보여 준다.
    if (clusterIds) list = list.filter((venue) => clusterIds.includes(venue.id))
    return list
  }, [allVenues, typeFilter, keyword, clusterIds])

  const markers = useMemo(
    () =>
      visibleVenues
        .filter((venue) => venue.mappable && venue.lat != null && venue.lng != null)
        .map((venue) => ({
          id: venue.id,
          lat: venue.lat as number,
          lng: venue.lng as number,
          name: venueDisplayName(venue, i18n.language),
        })),
    [visibleVenues, i18n.language],
  )

  const selectedVenue = allVenues.find((venue) => venue.id === selectedId) ?? null

  // 지도 시야: 선택된 장소 > 도시 중심
  const center = useMemo<[number, number]>(() => {
    if (selectedVenue?.lat != null && selectedVenue?.lng != null) {
      return [selectedVenue.lng, selectedVenue.lat]
    }
    if (cityDetail) return [cityDetail.city.centerLng, cityDetail.city.centerLat]
    return FALLBACK_CENTER
  }, [selectedVenue, cityDetail])

  const zoom = selectedVenue ? 16 : cityDetail?.city.defaultZoom ?? FALLBACK_ZOOM

  /**
   * 지도 시야 여백.
   *
   * 데스크톱에서는 <b>0 이다</b>. 좌측 패널은 지도 컨테이너 바깥의 형제 요소라
   * 캔버스가 이미 "보이는 영역"과 같다 — 여기에 left 패딩을 또 주면 중심이 오른쪽으로
   * 한 번 더 밀려 마커가 우측에 치우친다.
   *
   * 모바일에서만 bottom 을 준다. 거기서는 시트가 지도 <b>위에 겹쳐</b> 있어
   * 캔버스 아래쪽 일부가 실제로 가려지기 때문이다.
   */
  const mapPadding = useMemo(
    () => (isDesktop ? {} : { bottom: sheetHeight }),
    [isDesktop, sheetHeight],
  )

  const selectVenue = useCallback(
    (id: number) => {
      updateParam({ venue: String(id) })
      setSheetSnap('half')
    },
    [updateParam],
  )

  const clearSelection = useCallback(() => {
    updateParam({ venue: null })
    setSheetSnap('peek')
  }, [updateParam])

  const locateMe = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // 가장 가까운 장소를 고른다. 지도만 옮기면 "그래서 뭐" 가 되므로 목록과 함께 움직인다.
        const { latitude, longitude } = position.coords
        let nearest: { id: number; distance: number } | null = null
        for (const venue of markers) {
          const distance = (venue.lat - latitude) ** 2 + (venue.lng - longitude) ** 2
          if (!nearest || distance < nearest.distance) nearest = { id: venue.id, distance }
        }
        if (nearest) selectVenue(nearest.id)
      },
      () => {
        // 거부·타임아웃은 조용히 넘어간다. 권한 프롬프트를 두 번 띄우지 않는다.
      },
      { timeout: 8000 },
    )
  }

  const country = countries?.find((c) => c.countryCode === resolved?.country)
  const isFiltered = !!typeFilter || !!keyword.trim() || !!clusterIds

  const panelContent = selectedId ? (
    <VenueDetailPanel
      venueId={selectedId}
      fallbackSummary={selectedVenue}
      onBack={clearSelection}
      onClose={clearSelection}
    />
  ) : (
    <VenueListPanel
      venues={visibleVenues}
      isLoading={cityLoading || countriesLoading}
      selectedId={selectedId}
      hoveredId={hoveredId}
      onSelect={selectVenue}
      onHover={setHoveredId}
      filtered={isFiltered}
      onResetFilter={() => {
        setKeyword('')
        setClusterIds(null)
        updateParam({ type: null })
      }}
    />
  )

  return (
    <>
      {/* 탐색용 앱 화면이라 색인하지 않는다 — 검색 유입은 /venues/* 문서 페이지가 맡는다. */}
      <SeoMeta title={t('venue.map.title', '주류 장소 지도')} noindex />

      {/* 상단 바 — EditorLayout 은 껍데기만 주므로 페이지가 직접 그린다 */}
      <header className="z-20 shrink-0 border-b border-neutral-200 bg-white">
        <div className="flex items-center gap-2 px-3 py-2">
          <Link
            to="/"
            className="flex min-h-[40px] items-center px-2 text-sm font-bold text-primary-800"
          >
            ‹ CaskByCask
          </Link>
          <h1 className="text-sm font-semibold text-neutral-800">
            {t('venue.map.title', '주류 장소 지도')}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <label className="sr-only" htmlFor="venue-search">
              {t('venue.map.search', '장소 검색')}
            </label>
            <input
              id="venue-search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('venue.map.search', '장소 검색')}
              className="h-9 w-32 border border-neutral-300 px-2 text-sm sm:w-48
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>

        {/* 국가 · 도시 · 종류 */}
        <div className="flex items-center gap-2 overflow-x-auto px-3 pb-2">
          <VenueCountrySelect
            countries={countries ?? []}
            value={resolved?.country ?? null}
            onChange={(countryCode) => {
              const nextCountry = countries?.find((c) => c.countryCode === countryCode)
              const nextCity = nextCountry?.cities[0]
              if (!nextCountry || !nextCity) return
              setClusterIds(null)
              updateParam({ country: nextCountry.countryCode, city: nextCity.slug, venue: null })
            }}
          />

          <div className="flex shrink-0 gap-1">
            {(country?.cities ?? []).map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => {
                  setClusterIds(null)
                  updateParam({ city: city.slug, venue: null })
                }}
                aria-pressed={city.slug === resolved?.city}
                className={`inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5
                  text-xs font-medium transition-colors ${
                    city.slug === resolved?.city
                      ? 'bg-primary-800 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
              >
                {i18n.language === 'en' ? city.nameEn : city.nameKo}
                <span className="ml-1 opacity-70">{city.venueCount}</span>
              </button>
            ))}
          </div>

          <div className="ml-auto flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => updateParam({ type: null })}
              aria-pressed={!typeFilter}
              className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-medium
                transition-colors ${
                  !typeFilter
                    ? 'bg-neutral-800 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
            >
              {t('venue.map.allTypes', '전체')}
            </button>
            {VENUE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateParam({ type: typeFilter === type ? null : type })}
                aria-pressed={typeFilter === type}
                className={`inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5
                  text-xs font-medium transition-colors ${
                    typeFilter === type
                      ? 'bg-neutral-800 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
              >
                {t(venueTypeLabelKey(type), type)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 지도 건너뛰기 — 지도는 키보드로 다룰 수 없으므로 목록으로 바로 갈 길을 준다 */}
      <a
        href="#venue-list"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50
          focus:bg-white focus:px-3 focus:py-2 focus:text-sm"
      >
        {t('venue.map.skipToList', '지도 건너뛰고 목록으로')}
      </a>

      <div className="relative flex min-h-0 flex-1">
        {/* 데스크톱 좌측 패널 */}
        <aside
          id="venue-list"
          style={{ width: PANEL_WIDTH }}
          className="hidden min-h-0 shrink-0 flex-col overflow-hidden border-r border-neutral-200
            bg-white lg:flex"
        >
          {selectedId ? (
            panelContent
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">{panelContent}</div>
          )}
        </aside>

        {/* 지도 */}
        <div className="relative min-h-0 flex-1">
          {mapState === 'unsupported' ? (
            <div className="flex h-full items-center justify-center bg-neutral-50 px-6 text-center">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  {t('venue.map.webglUnsupported', '이 브라우저에서는 지도를 표시할 수 없어요.')}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {t('venue.map.listStillWorks', '목록에서 주소·전화·지도 앱 링크를 그대로 쓸 수 있어요.')}
                </p>
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-neutral-50">
                  <Spinner />
                </div>
              }
            >
              <VenueMap
                className="h-full w-full"
                center={center}
                zoom={zoom}
                markers={markers}
                selectedId={hoveredId ?? selectedId}
                onSelectVenue={selectVenue}
                onClusterVenues={(ids) => {
                  // 최대 줌에서도 안 풀린 클러스터 — 목록으로 해소한다.
                  setClusterIds(ids)
                  setSheetSnap('half')
                }}
                padding={mapPadding}
                lang={i18n.language}
                onUnsupported={() => setMapState('unsupported')}
                onTileError={() => setMapState((prev) => (prev === 'ok' ? 'tile-error' : prev))}
              />
            </Suspense>
          )}

          {mapState === 'tile-error' && (
            <p className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full
              bg-neutral-900/80 px-3 py-1.5 text-xs text-white">
              {t('venue.map.tileError', '지도를 불러오지 못했어요. 목록은 그대로 쓸 수 있어요.')}
            </p>
          )}

          {clusterIds && (
            <button
              type="button"
              onClick={() => setClusterIds(null)}
              className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-white px-3 py-1.5
                text-xs shadow lg:top-3"
            >
              {t('venue.map.clusterGroup', '겹친 장소 {{count}}곳 보는 중 · 전체 보기', {
                count: clusterIds.length,
              })}
            </button>
          )}

          {/* 내 위치 — 자동으로 묻지 않는다. 권한 프롬프트는 사용자가 눌렀을 때만 */}
          <button
            type="button"
            onClick={locateMe}
            aria-label={t('venue.map.myLocation', '내 위치에서 가까운 곳')}
            className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center
              rounded-full bg-white text-lg shadow-md hover:bg-neutral-50
              lg:bottom-6 lg:right-6"
            style={{ bottom: `calc(1rem + ${sheetHeight}px)` }}
          >
            ◎
          </button>
        </div>

        {/* 모바일 바텀시트 */}
        <VenueBottomSheet snap={sheetSnap} onSnapChange={setSheetSnap} onHeightChange={setSheetHeight}>
          {panelContent}
        </VenueBottomSheet>
      </div>
    </>
  )
}
