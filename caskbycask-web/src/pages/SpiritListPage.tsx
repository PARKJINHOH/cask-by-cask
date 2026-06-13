import { useState, useEffect, useCallback, useLayoutEffect, useRef, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type {
  SpiritCategory, SpiritSort, WhiskyStyle, WineType, CognacGrade,
} from '@/domain/spirit/types/spirit.types'
import SpiritCard from '@/shared/components/SpiritCard'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import EmptyState from '@/shared/components/EmptyState'
import RangeSlider from '@/shared/components/RangeSlider'
import CategoryTree from '@/domain/spirit/components/filter/CategoryTree'
import CountryCombobox from '@/domain/spirit/components/filter/CountryCombobox'
import RegionChips from '@/domain/spirit/components/filter/RegionChips'
import ActiveFilterChips, {
  type ActiveFilterState,
} from '@/domain/spirit/components/filter/ActiveFilterChips'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { buildBreadcrumbSchema, buildItemListSchema } from '@/shared/utils/seoSchema'

// ── SEO 카테고리별 메타 ─────────────────────────────────────────
const CATEGORY_META: Record<SpiritCategory | '', {
  titleKo: string; titleEn: string; descKo: string; descEn: string;
  keywordsKo: string; keywordsEn: string;
}> = {
  '':       { titleKo: '주류 카탈로그',  titleEn: 'Spirit Catalog',
              descKo: '위스키, 와인, 꼬냑, 럼, 데킬라까지 — CaskByCask 의 주류 전체 카탈로그를 탐색하고 사용자 평점·리뷰를 확인하세요.',
              descEn: 'Browse the full spirit catalog — whisky, wine, cognac, rum, tequila and more. User ratings and reviews on CaskByCask.',
              keywordsKo: '주류 리뷰, 위스키 추천, 와인 추천, 꼬냑 추천, 증류소, 캐스크바이캐스크',
              keywordsEn: 'spirit review, whisky catalog, wine catalog, cognac catalog, caskbycask' },
  WHISKY:   { titleKo: '위스키',       titleEn: 'Whisky',
              descKo: '싱글 몰트, 블렌디드, 버번까지. 증류소·지역별 위스키 정보와 사용자 평점을 한 곳에서.',
              descEn: 'Single malt, blended, bourbon and more. Explore whisky by producer and region with user ratings.',
              keywordsKo: '위스키, 싱글 몰트, 블렌디드 위스키, 버번, 스카치, 아이리시 위스키, 위스키 리뷰',
              keywordsEn: 'whisky, single malt, blended whisky, bourbon, scotch, irish whiskey, whisky review' },
  COGNAC:   { titleKo: '꼬냑',         titleEn: 'Cognac',
              descKo: 'VS·VSOP·XO 등급별, 그랑드 샹파뉴·프티트 샹파뉴 등 크뤼별 꼬냑 정보와 사용자 리뷰.',
              descEn: 'Cognac by grade (VS, VSOP, XO) and cru (Grande/Petite Champagne, etc.). User reviews and ratings.',
              keywordsKo: '꼬냑, VS VSOP XO, 그랑드 샹파뉴, 헤네시, 레미마틴, 꼬냑 리뷰, 꼬냑 등급',
              keywordsEn: 'cognac, VS VSOP XO, Grande Champagne, Hennessy, Remy Martin, cognac review, cognac grade' },
  WINE:     { titleKo: '와인',         titleEn: 'Wine',
              descKo: '레드·화이트·스파클링·디저트 와인. 와이너리·국가·지역별 와인 정보와 사용자 평점.',
              descEn: 'Red, white, sparkling and dessert wines. Browse wines by winery, country and region.',
              keywordsKo: '와인, 레드 와인, 화이트 와인, 스파클링, 빈티지, 와이너리, 와인 리뷰, 내추럴 와인',
              keywordsEn: 'wine, red wine, white wine, sparkling wine, vintage, winery, wine review, natural wine' },
  OTHER:    { titleKo: '기타 주류',     titleEn: 'Other Spirits',
              descKo: '럼, 데킬라, 진, 보드카 등 기타 주류 카탈로그. 사용자 평점과 리뷰.',
              descEn: 'Rum, tequila, gin, vodka and other spirits. User ratings and reviews.',
              keywordsKo: '럼, 데킬라, 진, 보드카, 기타 주류, 주류 리뷰',
              keywordsEn: 'rum, tequila, gin, vodka, spirits review' },
}

const SORT_VALUES: SpiritSort[] = ['LATEST', 'SCORE_DESC', 'REVIEW_COUNT_DESC']

// ── 필터 패널 ─────────────────────────────────────────────────
interface FilterPanelProps {
  category:     SpiritCategory | ''
  whiskyStyle:  WhiskyStyle[]
  wineType:     WineType[]
  cognacGrade:  CognacGrade[]
  country:      string
  region:       string
  abvRange:     [number, number]
  scoreRange:   [number, number]
  onCategory:   (v: SpiritCategory | '') => void
  onWhiskyStyle: (v: WhiskyStyle[]) => void
  onWineType:   (v: WineType[]) => void
  onCognacGrade: (v: CognacGrade[]) => void
  onCountry:    (v: string) => void
  onRegion:     (v: string) => void
  onAbv:        (v: [number, number]) => void
  onAbvEnd:     (v: [number, number]) => void
  onScore:      (v: [number, number]) => void
  onScoreEnd:   (v: [number, number]) => void
  onReset:      () => void
}

function FilterPanel(p: FilterPanelProps) {
  const { t } = useTranslation()

  return (
    // 섹션 사이 구분선: 첫 섹션(카테고리) 제외, 이후 모든 섹션 상단에 border-t + 여백
    <div className="space-y-5 [&>*+*]:pt-4 [&>*+*]:border-t [&>*+*]:border-neutral-100">
      <CategoryTree
        category={p.category}
        whiskyStyle={p.whiskyStyle}
        wineType={p.wineType}
        cognacGrade={p.cognacGrade}
        onCategory={p.onCategory}
        onWhiskyStyle={p.onWhiskyStyle}
        onWineType={p.onWineType}
        onCognacGrade={p.onCognacGrade}
      />

      <CountryCombobox
        category={p.category}
        value={p.country}
        onChange={p.onCountry}
      />

      <RegionChips
        category={p.category}
        country={p.country}
        value={p.region}
        onChange={p.onRegion}
      />

      {/* 도수 */}
      <div>
        <h3 className="text-sm font-bold text-neutral-900 mb-3">
          {t('spirit.filter.abv')}
        </h3>
        <RangeSlider
          min={0} max={100}
          value={p.abvRange}
          onChange={p.onAbv}
          onChangeEnd={p.onAbvEnd}
          step={1}
          formatLabel={(v) => `${v}%`}
        />
      </div>

      {/* 평균 점수 */}
      <div>
        <h3 className="text-sm font-bold text-neutral-900 mb-3">
          {t('spirit.filter.score')}
        </h3>
        <RangeSlider
          min={0} max={100}
          value={p.scoreRange}
          onChange={p.onScore}
          onChangeEnd={p.onScoreEnd}
          step={1}
        />
      </div>

      {/* 초기화 */}
      <div>
        <button
          onClick={p.onReset}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold
            text-neutral-600 border border-neutral-200 rounded-xl
            hover:border-danger-200 hover:text-danger-600 hover:bg-danger-50/40 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 2v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
          </svg>
          {t('spirit.filter.reset')}
        </button>
      </div>
    </div>
  )
}

// ── 모바일 필터 드로어 ─────────────────────────────────────────
interface DrawerProps { open: boolean; onClose: () => void; children: React.ReactNode }

function FilterDrawer({ open, onClose, children }: DrawerProps) {
  const { t } = useTranslation()

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        </TransitionChild>
        <div className="fixed inset-0 flex">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-250" enterFrom="-translate-x-full" enterTo="translate-x-0"
            leave="ease-in duration-200" leaveFrom="translate-x-0" leaveTo="-translate-x-full"
          >
            <DialogPanel className="relative w-80 max-w-[85vw] bg-white h-full overflow-y-auto shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <DialogTitle className="font-semibold text-neutral-900">
                  {t('spirit.filter.title')}
                </DialogTitle>
                <button
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="p-5 flex-1">{children}</div>
              <div className="p-4 border-t border-neutral-100">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-primary-800 text-white text-sm font-medium
                    rounded-lg hover:bg-primary-900 transition-colors"
                >
                  {t('spirit.filter.apply')}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function SpiritListPage() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // PC 좌측 필터 패널 — 본문(목록)과 완전히 독립된 스크롤 영역.
  // row(relative) 안에서 absolute 로 배치하고, 스크롤에 따라 top 을 직접 계산해
  // "뷰포트 상단에서 chromeTop 만큼 떨어진 위치에 고정"되다가 row 하단(=footer 직전)에서 멈추도록 함
  // → fixed 와 달리 footer 를 침범하지 않음.
  const rowRef = useRef<HTMLDivElement>(null)
  const filterContentRef = useRef<HTMLDivElement>(null)
  const [chromeTop, setChromeTop] = useState(0) // 헤더+GNB 높이 + 여백
  // 패널 높이 = min(필터 내용의 실제 높이, 뷰포트에서 사용 가능한 높이).
  // - 필터가 적용 안 된 기본 상태처럼 내용이 짧으면 그 높이만큼만 차지(스크롤바 없음)
  // - 내용이 길어 화면을 넘으면 뷰포트 높이로 제한하고 패널 내부에서만 스크롤
  // spacer 의 min-height 로도 사용해 본문(row) 높이를 패널 높이만큼 확보 → footer 침범 방지.
  const [panelHeight, setPanelHeight] = useState<number | null>(null)
  const [panelTop, setPanelTop] = useState(0)

  // 헤더 + GNB(둘 다 sticky) 높이 측정 → 패널의 viewport 기준 top 오프셋
  useLayoutEffect(() => {
    const update = () => {
      const header = document.querySelector('header')
      const nav = document.querySelector('nav')
      const chromeHeight = (header?.getBoundingClientRect().height ?? 0)
        + (nav?.getBoundingClientRect().height ?? 0)
      setChromeTop(chromeHeight + 24)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // 필터 내용의 실제 높이 → panelHeight
  useLayoutEffect(() => {
    const PANEL_PADDING_Y = 32 // p-4 (1rem) * 2
    const update = () => {
      const content = filterContentRef.current
      if (!content) return
      const contentHeight = content.getBoundingClientRect().height + PANEL_PADDING_Y
      const viewportMax = window.innerHeight - chromeTop - 24
      setPanelHeight(Math.min(contentHeight, viewportMax))
    }
    update()
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    if (filterContentRef.current) ro.observe(filterContentRef.current)
    return () => {
      window.removeEventListener('resize', update)
      ro.disconnect()
    }
  }, [chromeTop])

  // 스크롤 위치에 따라 패널의 top(row 기준 absolute) 계산
  // - 0 ~ (rowHeight - panelHeight) 범위로 clamp → row 상단에서 시작해 row 하단(footer 직전)에서 멈춤
  useLayoutEffect(() => {
    if (panelHeight == null) return
    const update = () => {
      const row = rowRef.current
      if (!row) return
      const rect = row.getBoundingClientRect()
      const rowTopDoc = rect.top + window.scrollY
      const desired = window.scrollY + chromeTop - rowTopDoc
      const max = Math.max(rect.height - panelHeight, 0)
      setPanelTop(Math.min(Math.max(desired, 0), max))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    if (rowRef.current) ro.observe(rowRef.current)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      ro.disconnect()
    }
  }, [panelHeight, chromeTop])

  // URL에서 필터 값 읽기
  const category    = (searchParams.get('category') as SpiritCategory) ?? ''
  const whiskyStyle = searchParams.getAll('whiskyStyle') as WhiskyStyle[]
  const wineType    = searchParams.getAll('wineType') as WineType[]
  const cognacGrade = searchParams.getAll('cognacGrade') as CognacGrade[]
  const country     = searchParams.get('country') ?? ''
  const region      = searchParams.get('region')  ?? ''
  const sort        = (searchParams.get('sort') as SpiritSort) ?? 'LATEST'
  const page        = parseInt(searchParams.get('page')     ?? '0')
  const urlMinAbv   = parseFloat(searchParams.get('minAbv') ?? '0')
  const urlMaxAbv   = parseFloat(searchParams.get('maxAbv') ?? '100')
  const urlMinScore = parseFloat(searchParams.get('minScore') ?? '0')
  const urlMaxScore = parseFloat(searchParams.get('maxScore') ?? '100')

  // 키워드 (Enter 또는 검색 버튼 클릭 시에만 검색)
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') ?? '')

  const submitKeyword = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      keywordInput ? next.set('keyword', keywordInput) : next.delete('keyword')
      next.set('page', '0')
      return next
    }, { replace: true })
  }

  // 슬라이더 로컬 상태 (포인터업 시에만 URL 업데이트)
  const [abvRange,   setAbvRange]   = useState<[number, number]>([urlMinAbv, urlMaxAbv])
  const [scoreRange, setScoreRange] = useState<[number, number]>([urlMinScore, urlMaxScore])

  useEffect(() => { setAbvRange([urlMinAbv, urlMaxAbv]) }, [urlMinAbv, urlMaxAbv]) // eslint-disable-line
  useEffect(() => { setScoreRange([urlMinScore, urlMaxScore]) }, [urlMinScore, urlMaxScore]) // eslint-disable-line

  const setParam = useCallback((updates: Record<string, string | number | string[] | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          next.delete(k)
          v.forEach((item) => {
            if (item !== '' && item != null) next.append(k, String(item))
          })
        } else if (v === null || v === '' || v === 0) {
          next.delete(k)
        } else {
          next.set(k, String(v))
        }
      })
      if (!Object.keys(updates).includes('page')) next.set('page', '0')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const commitAbv   = ([lo, hi]: [number, number]) => {
    setParam({ minAbv: lo > 0 ? lo : null, maxAbv: hi < 100 ? hi : null })
  }
  const commitScore = ([lo, hi]: [number, number]) => {
    setParam({ minScore: lo > 0 ? lo : null, maxScore: hi < 100 ? hi : null })
  }
  const handleReset = () => {
    setAbvRange([0, 100])
    setScoreRange([0, 100])
    setKeywordInput('')
    setSearchParams({}, { replace: true })
  }

  // 카테고리 변경 시 region도 클리어 (다른 카테고리에서 의미 없음)
  const handleCategoryChange = (v: SpiritCategory | '') => {
    setParam({
      category: v,
      whiskyStyle: [], wineType: [], cognacGrade: [],
      region: null,
    })
  }

  // 국가 변경 시 region 클리어
  const handleCountryChange = (v: string) => {
    setParam({ country: v, region: null })
  }

  // ActiveFilterChips용 클리어 핸들러
  const handleClearKey = (
    key: keyof ActiveFilterState | 'abv' | 'score',
    value?: string,
  ) => {
    if (key === 'abv') {
      setAbvRange([0, 100])
      setParam({ minAbv: null, maxAbv: null })
    } else if (key === 'score') {
      setScoreRange([0, 100])
      setParam({ minScore: null, maxScore: null })
    } else if (key === 'category') {
      handleCategoryChange('')
    } else if (key === 'country') {
      handleCountryChange('')
    } else if (key === 'whiskyStyle') {
      setParam({ whiskyStyle: value ? whiskyStyle.filter((v) => v !== value) : [] })
    } else if (key === 'wineType') {
      setParam({ wineType: value ? wineType.filter((v) => v !== value) : [] })
    } else if (key === 'cognacGrade') {
      setParam({ cognacGrade: value ? cognacGrade.filter((v) => v !== value) : [] })
    } else if (key === 'minAbv' || key === 'maxAbv'
            || key === 'minScore' || key === 'maxScore') {
      // ActiveFilterState 타입상 키지만 abv/score 묶음으로만 클리어됨 — 무시
    } else {
      setParam({ [key]: null })
    }
  }

  // 쿼리
  const keyword = searchParams.get('keyword') ?? ''
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['spirits', {
      keyword, category, whiskyStyle, wineType, cognacGrade,
      country, region, sort, page,
      minAbv: urlMinAbv, maxAbv: urlMaxAbv, minScore: urlMinScore, maxScore: urlMaxScore,
    }],
    queryFn: () =>
      spiritApi.search({
        keyword:     keyword     || undefined,
        category:    (category as SpiritCategory) || undefined,
        whiskyStyle: whiskyStyle.length > 0 ? whiskyStyle : undefined,
        wineType:    wineType.length > 0    ? wineType    : undefined,
        cognacGrade: cognacGrade.length > 0 ? cognacGrade : undefined,
        country:     country     || undefined,
        region:      region      || undefined,
        sort,
        page,
        size: 20,
        minAbv:    urlMinAbv   > 0   ? urlMinAbv   : undefined,
        maxAbv:    urlMaxAbv   < 100 ? urlMaxAbv   : undefined,
        minScore:  urlMinScore > 0   ? urlMinScore : undefined,
        maxScore:  urlMaxScore < 100 ? urlMaxScore : undefined,
      }).then((r) => r.data.data!),
    staleTime: 30_000,
  })

  const filterProps: FilterPanelProps = {
    category, whiskyStyle, wineType, cognacGrade,
    country, region, abvRange, scoreRange,
    onCategory:    handleCategoryChange,
    onWhiskyStyle: (v) => setParam({ whiskyStyle: v }),
    onWineType:    (v) => setParam({ wineType: v }),
    onCognacGrade: (v) => setParam({ cognacGrade: v }),
    onCountry:     handleCountryChange,
    onRegion:      (v) => setParam({ region: v }),
    onAbv:         setAbvRange,
    onAbvEnd:      commitAbv,
    onScore:       setScoreRange,
    onScoreEnd:    commitScore,
    onReset:       handleReset,
  }

  const activeState: ActiveFilterState = {
    category, whiskyStyle, wineType, cognacGrade,
    country, region,
    minAbv: urlMinAbv, maxAbv: urlMaxAbv,
    minScore: urlMinScore, maxScore: urlMaxScore,
  }

  // 모바일 필터 버튼 배지용 활성 필터 개수
  const activeFilterCount =
    (category ? 1 : 0)
    + whiskyStyle.length + wineType.length + cognacGrade.length
    + (country ? 1 : 0) + (region ? 1 : 0)
    + (urlMinAbv > 0 || urlMaxAbv < 100 ? 1 : 0)
    + (urlMinScore > 0 || urlMaxScore < 100 ? 1 : 0)

  // ── SEO 메타 계산 ────────────────────────────────────────
  const isEn = i18n.language === 'en'
  const meta = CATEGORY_META[category] ?? CATEGORY_META['']
  // canonical: 카테고리만 보존, 세부 필터/페이지/sort 는 제거 (중복 인덱싱 방지)
  const seoCanonical = category
    ? buildCanonical(`/spirits?category=${category}`)
    : buildCanonical('/spirits')
  // keyword 검색결과 / 2페이지 이후는 noindex (무한 인덱싱 방지)
  const seoNoindex = !!keyword || page > 0

  // JSON-LD: Breadcrumb + ItemList (+ CollectionPage 카테고리 페이지)
  const seoBreadcrumb = buildBreadcrumbSchema(
    category
      ? [
          { name: isEn ? 'Home' : '홈', path: '/' },
          { name: isEn ? 'Spirits' : '주류 카탈로그', path: '/spirits' },
          { name: isEn ? meta.titleEn : meta.titleKo,
            path: `/spirits?category=${category}` },
        ]
      : [
          { name: isEn ? 'Home' : '홈', path: '/' },
          { name: isEn ? 'Spirits' : '주류 카탈로그', path: '/spirits' },
        ],
  )

  const seoItemList = buildItemListSchema(
    (data?.content ?? []).slice(0, 20).map((s) => ({
      name: isEn ? (s.nameEn || s.nameKo) : s.nameKo,
      path: `/spirits/${s.id}`,
    })),
  )

  const seoJsonLd = [
    seoBreadcrumb,
    ...(seoItemList.itemListElement.length > 0 ? [seoItemList] : []),
    ...(category ? [{
      '@type': 'CollectionPage' as const,
      name: isEn ? meta.titleEn : meta.titleKo,
      description: isEn ? meta.descEn : meta.descKo,
    }] : []),
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <SeoMeta
        title={isEn ? meta.titleEn : meta.titleKo}
        description={isEn ? meta.descEn : meta.descKo}
        canonical={seoCanonical}
        locale={isEn ? 'en_US' : 'ko_KR'}
        noindex={seoNoindex}
        keywords={isEn ? meta.keywordsEn : meta.keywordsKo}
        jsonLd={seoJsonLd}
      />

      <div ref={rowRef} className="flex gap-6 relative">
        {/* PC 좌측 필터 패널 — 본문(목록)과 완전히 독립된 스크롤 영역.
            spacer 로 자리만 차지(min-height 로 패널 높이만큼 확보 → footer 침범 방지),
            실제 패널은 row(relative) 기준 absolute 로 배치하고 스크롤에 맞춰 top 을 계산해
            "뷰포트 상단에 고정된 것처럼" 보이다가 row 하단(=footer 직전)에서 멈춤.
            overscroll-contain 으로 사이드바 스크롤이 목록(페이지)으로 전파되지 않음(그 반대도 동일).
            패널 높이 = min(필터 내용 실제 높이, 뷰포트 가용 높이) — 필터 미적용 등으로
            내용이 짧으면 스크롤바 없이 내용 높이만큼만 차지. */}
        <aside
          className="hidden lg:block w-72 flex-shrink-0"
          style={panelHeight != null ? { minHeight: panelHeight } : undefined}
        />
        <div
          className="hidden lg:block absolute left-0 w-72 z-10 bg-white rounded-2xl border border-neutral-200 p-4
            overflow-y-auto overscroll-contain"
          style={{
            top: panelTop,
            height: panelHeight ?? 'auto',
          }}
        >
          <div ref={filterContentRef}>
            <FilterPanel {...filterProps} />
          </div>
        </div>

        {/* 메인 영역 */}
        <div className="flex-1 min-w-0">
          {/* 적용된 필터 칩 */}
          <ActiveFilterChips
            state={activeState}
            onClear={handleClearKey}
            onClearAll={handleReset}
          />

          {/* 정렬 + 건수 + 모바일 필터 버튼 */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <p className="text-sm text-neutral-500">
              {data && (
                <Trans
                  i18nKey="spirit.count"
                  values={{ n: data.totalElements }}
                  components={[<span className="font-semibold text-neutral-900" />]}
                />
              )}
            </p>
            <div className="flex items-center gap-2">
              {/* 모바일 필터 버튼 (PC는 좌측 패널 사용) */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden relative flex items-center gap-1.5 px-3.5 py-1.5 border border-neutral-300
                  rounded-lg text-sm text-neutral-700 hover:bg-neutral-50 transition-colors bg-white"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/>
                  <line x1="12" y1="18" x2="20" y2="18"/>
                </svg>
                {t('spirit.filter.title')}
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1
                    rounded-full bg-primary-600 text-white text-[10px] font-bold
                    flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <select
                value={sort}
                onChange={(e) => setParam({ sort: e.target.value })}
                className="text-sm border border-neutral-300 rounded-lg px-3 py-1.5 bg-white
                  focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-700"
              >
                {SORT_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {t(`spirit.sort.${v}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 목록 */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" className="text-primary-800" />
            </div>
          ) : !data || data.empty ? (
            <EmptyState
              title={t('spirit.noResult.title')}
              description={t('spirit.noResult.description')}
              action={{ label: t('spirit.noResult.reset'), onClick: handleReset }}
            />
          ) : (
            <div
              className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4
                transition-opacity ${isFetching ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {data.content.map((spirit) => (
                <SpiritCard key={spirit.id} spirit={spirit} />
              ))}
            </div>
          )}

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={(p) => setParam({ page: p })}
              className="mt-8"
            />
          )}
        </div>
      </div>

      {/* 모바일 필터 드로어 (PC 헤더 검색이 모바일엔 없으므로 키워드 검색을 여기 포함) */}
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <form onSubmit={submitKeyword} className="relative mb-5">
          <input
            type="search"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder={t('spirit.search.placeholder')}
            className="w-full pl-4 pr-10 py-2.5 border border-neutral-300 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
          />
          <button
            type="submit"
            aria-label={t('nav.search')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </form>
        <FilterPanel {...filterProps} />
      </FilterDrawer>

    </div>
  )
}
