import { useState, useEffect, useCallback, useLayoutEffect, useRef, Fragment } from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'

import { useTranslation, Trans } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type {
  SpiritCategory, SpiritSort, WhiskyStyle, WineType, CognacGrade,
  WineSweetness, WineBody, WineIntensity, SpiritAutocompleteItem,
} from '@/domain/spirit/types/spirit.types'
import axios from 'axios'
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
import { getSpiritListDisplayNames } from '@/domain/spirit/utils/spiritDisplayName'
import { getSpiritCanonicalPath, getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
import { SEARCH_DEBOUNCE_MS } from '@/shared/hooks/useDebouncedValue'

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
  wineSweetness: WineSweetness[]
  wineBody:     WineBody[]
  wineAcidity:  WineIntensity[]
  wineTannin:   WineIntensity[]
  country:      string
  region:       string
  abvRange:     [number, number]
  scoreRange:   [number, number]
  onCategory:   (v: SpiritCategory | '') => void
  onWhiskyStyle: (v: WhiskyStyle[]) => void
  onWineType:   (v: WineType[]) => void
  onCognacGrade: (v: CognacGrade[]) => void
  onWineSweetness: (v: WineSweetness[]) => void
  onWineBody:   (v: WineBody[]) => void
  onWineAcidity: (v: WineIntensity[]) => void
  onWineTannin: (v: WineIntensity[]) => void
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
        wineSweetness={p.wineSweetness}
        wineBody={p.wineBody}
        wineAcidity={p.wineAcidity}
        wineTannin={p.wineTannin}
        onCategory={p.onCategory}
        onWhiskyStyle={p.onWhiskyStyle}
        onWineType={p.onWineType}
        onCognacGrade={p.onCognacGrade}
        onWineSweetness={p.onWineSweetness}
        onWineBody={p.onWineBody}
        onWineAcidity={p.onWineAcidity}
        onWineTannin={p.onWineTannin}
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
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const detailState = { returnTo: `${location.pathname}${location.search}` }

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
  const wineSweetness = searchParams.getAll('wineSweetness') as WineSweetness[]
  const wineBody    = searchParams.getAll('wineBody') as WineBody[]
  const wineAcidity = searchParams.getAll('wineAcidity') as WineIntensity[]
  const wineTannin  = searchParams.getAll('wineTannin') as WineIntensity[]
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
  const [isFocused, setIsFocused] = useState(false)
  const [results, setResults] = useState<SpiritAutocompleteItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false)

  const cacheRef = useRef<Map<string, SpiritAutocompleteItem[]>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimeoutRef = useRef<number | NodeJS.Timeout | null>(null)

  const handleKeywordChange = (val: string) => {
    setKeywordInput(val)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current as number)
    }

    const kw = val.trim()
    if (kw.length < 2) {
      setResults([])
      setIsOpen(false)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      return
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      // 1. 로컬 메모리 캐시 체크
      if (cacheRef.current.has(kw)) {
        setResults(cacheRef.current.get(kw) || [])
        setIsOpen(true)
        return
      }

      // 2. 이전 API 요청 취소 (AbortController)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setIsAutocompleteLoading(true)

      try {
        const res = await spiritApi.autocomplete(kw, controller.signal)
        const items = res.data.data ?? []
        cacheRef.current.set(kw, items)
        setResults(items)
        setIsOpen(true)
      } catch (err: any) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError' && !axios.isCancel(err)) {
          console.error('Failed to autocomplete spirits:', err)
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setIsAutocompleteLoading(false)
        }
      }
    }, SEARCH_DEBOUNCE_MS)
  }


  const submitKeyword = (e: React.FormEvent) => {
    e.preventDefault()
    const kw = keywordInput.trim()
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      kw ? next.set('keyword', kw) : next.delete('keyword')
      next.set('page', '0')
      return next
    }, { replace: true })
    setIsOpen(false)
  }

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current as number)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

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
    setResults([])
    setIsOpen(false)
    setSearchParams({}, { replace: true })
  }


  // 카테고리 변경 시 region도 클리어 (다른 카테고리에서 의미 없음)
  const handleCategoryChange = (v: SpiritCategory | '') => {
    setParam({
      category: v,
      whiskyStyle: [], wineType: [], cognacGrade: [],
      wineSweetness: [], wineBody: [], wineAcidity: [], wineTannin: [],
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
    } else if (key === 'wineSweetness') {
      setParam({ wineSweetness: value ? wineSweetness.filter((v) => v !== value) : [] })
    } else if (key === 'wineBody') {
      setParam({ wineBody: value ? wineBody.filter((v) => v !== value) : [] })
    } else if (key === 'wineAcidity') {
      setParam({ wineAcidity: value ? wineAcidity.filter((v) => v !== value) : [] })
    } else if (key === 'wineTannin') {
      setParam({ wineTannin: value ? wineTannin.filter((v) => v !== value) : [] })
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
      wineSweetness, wineBody, wineAcidity, wineTannin,
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
        wineSweetness: wineSweetness.length > 0 ? wineSweetness : undefined,
        wineBody:    wineBody.length > 0    ? wineBody    : undefined,
        wineAcidity: wineAcidity.length > 0 ? wineAcidity : undefined,
        wineTannin:  wineTannin.length > 0  ? wineTannin  : undefined,
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
    wineSweetness, wineBody, wineAcidity, wineTannin,
    country, region, abvRange, scoreRange,
    onCategory:    handleCategoryChange,
    onWhiskyStyle: (v) => setParam({ whiskyStyle: v }),
    onWineType:    (v) => setParam({ wineType: v }),
    onCognacGrade: (v) => setParam({ cognacGrade: v }),
    onWineSweetness: (v) => setParam({ wineSweetness: v }),
    onWineBody:    (v) => setParam({ wineBody: v }),
    onWineAcidity: (v) => setParam({ wineAcidity: v }),
    onWineTannin:  (v) => setParam({ wineTannin: v }),
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
    wineSweetness, wineBody, wineAcidity, wineTannin,
    country, region,
    minAbv: urlMinAbv, maxAbv: urlMaxAbv,
    minScore: urlMinScore, maxScore: urlMaxScore,
  }

  // 모바일 필터 버튼 배지용 활성 필터 개수
  const activeFilterCount =
    (category ? 1 : 0)
    + whiskyStyle.length + wineType.length + cognacGrade.length
    + wineSweetness.length + wineBody.length + wineAcidity.length + wineTannin.length
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
    (data?.content ?? []).slice(0, 20).map((s) => {
      const displayName = getSpiritListDisplayNames(s)
      return {
        name: isEn ? (displayName.nameEn || displayName.nameKo) : displayName.nameKo,
        path: getSpiritCanonicalPath(s, i18n.language, { includeLocale: true }),
      }
    }),
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
                <SpiritCard key={spirit.id} spirit={spirit} detailState={detailState} imageFit="contain" />
              ))}
            </div>
          )}

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={(p) => setParam({ page: p })}
              className="mt-8 mb-[calc(5rem+env(safe-area-inset-bottom))] lg:mb-0"
            />
          )}
        </div>
      </div>

      {/* 모바일 필터 드로어 */}
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <FilterPanel {...filterProps} />
      </FilterDrawer>

      {/* 모바일 하단 고정 검색창 (MO only, 스크롤 유지, 포커스 시 크기 변동) */}
      <div className="lg:hidden fixed left-4 right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 max-w-md mx-auto">
        <form
          onSubmit={submitKeyword}
          className={`relative transition-all duration-300 ease-out bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/80
            ${isFocused ? 'ring-2 ring-primary-400/30 border-primary-500 shadow-xl -translate-y-0.5' : ''}`}
        >
          {/* 모바일 자동완성 글래스모피즘 드롭다운 (위로 솟아오름) */}
          {isOpen && (results.length > 0 || isAutocompleteLoading) && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2.5 z-50 bg-white/90 backdrop-blur-md border border-neutral-200/80 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
              onMouseDown={(e) => e.preventDefault()}
            >
              {isAutocompleteLoading && results.length === 0 ? (
                <div className="p-3 text-center text-xs text-neutral-500">
                  {t('spirit.search.loading', '검색 중...')}
                </div>
              ) : results.length > 0 ? (
                <ul className="py-1">
                  {results.map((item) => {
                    const displayName = getSpiritListDisplayNames(item)
                    return (
                      <li key={item.id}>
                        <button
                          type="button"

                          onClick={() => {
                            navigate(getSpiritDetailPath(item, i18n.language))
                            setKeywordInput(displayName.nameKo)
                            setIsOpen(false)
                          }}
                          className="w-full text-left px-3.5 py-2 flex items-center gap-3 hover:bg-neutral-50/50 transition-colors"
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={displayName.nameKo}
                              className="w-8 h-8 object-contain rounded bg-white flex-shrink-0 border border-neutral-100"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-neutral-100/50 flex items-center justify-center text-neutral-400 flex-shrink-0 text-[8px]">
                              No Image
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-neutral-800 truncate">
                              {displayName.nameKo}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate">
                              {displayName.nameEn}
                            </div>
                          </div>
                          <span className="text-[9px] font-semibold bg-primary-50 text-primary-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {t(`category.${item.category.toLowerCase()}`, item.category)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          )}

          <input
            type="search"
            value={keywordInput}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onFocus={() => {
              setIsFocused(true)
              if (keywordInput.trim().length >= 2) {
                setIsOpen(true)
              }
            }}
            onBlur={() => {
              setIsFocused(false)
              setTimeout(() => setIsOpen(false), 200)
            }}
            placeholder={t('spirit.search.placeholder')}
            className={`w-full pl-5 pr-12 transition-all duration-300 ease-out rounded-full bg-transparent text-neutral-800 focus:outline-none
              ${isFocused ? 'py-2.5 h-10 text-sm' : 'py-1 h-8 text-xs'}`}
          />
          <button
            type="submit"
            aria-label={t('nav.search')}
            className={`absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary-600 transition-colors
              ${isFocused ? 'scale-110' : 'scale-100'}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </form>
      </div>


    </div>
  )
}
