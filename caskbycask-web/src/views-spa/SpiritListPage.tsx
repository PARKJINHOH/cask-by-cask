import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
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
import ListErrorState from '@/shared/components/ListErrorState'
import RangeSlider from '@/shared/components/RangeSlider'
import CategoryTree from '@/domain/spirit/components/filter/CategoryTree'
import CountryCombobox from '@/domain/spirit/components/filter/CountryCombobox'
import RegionChips from '@/domain/spirit/components/filter/RegionChips'
import ActiveFilterChips, {
  type ActiveFilterState,
} from '@/domain/spirit/components/filter/ActiveFilterChips'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { buildBreadcrumbSchema, buildItemListSchema } from '@/shared/utils/seoSchema'
import { getLocalizedSpiritListNames, getSpiritListDisplayNames } from '@/domain/spirit/utils/spiritDisplayName'
import { getSpiritCanonicalPath, getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
import { SEARCH_DEBOUNCE_MS } from '@/shared/hooks/useDebouncedValue'
import { useChromeTop } from '@/shared/hooks/useChromeTop'
import { useKeyboardInset } from '@/shared/hooks/useKeyboardInset'
import { scrollToPageTop } from '@/shared/utils/scrollToPageTop'
import {
  SPIRIT_CATEGORY_META as CATEGORY_META,
  isSpiritSeoCategory,
} from '@/domain/spirit/config/spiritSeo'

const SORT_VALUES: SpiritSort[] = ['LATEST', 'SCORE_DESC', 'REVIEW_COUNT_DESC']
const CATALOG_VIEW_STORAGE_KEY = 'di_spirit_catalog_view'
type CatalogViewMode = 'grid' | 'list'

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
  const [viewMode, setViewMode] = useState<CatalogViewMode>('grid')
  const detailState = { returnTo: `${location.pathname}${location.search}` }

  useEffect(() => {
    const savedViewMode = window.localStorage.getItem(CATALOG_VIEW_STORAGE_KEY)
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      setViewMode(savedViewMode)
    }
  }, [])

  const handleViewModeChange = (nextViewMode: CatalogViewMode) => {
    setViewMode(nextViewMode)
    window.localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, nextViewMode)
  }

  // PC 좌측 필터 패널을 sticky 헤더와 GNB 아래에 고정하기 위한 상단 간격(헤더+GNB 높이 + 여백).
  const chromeTop = useChromeTop() + 24

  // URL에서 필터 값 읽기
  const categoryValues = searchParams.getAll('category')
  const categoryParam = categoryValues[0] ?? null
  const category = isSpiritSeoCategory(categoryParam) ? categoryParam : ''
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
  // 하단 고정 검색창이 키보드 뒤로 숨지 않게 덮인 높이를 잰다.
  const keyboardInset = useKeyboardInset()
  const [results, setResults] = useState<SpiritAutocompleteItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false)

  const cacheRef = useRef<Map<string, SpiritAutocompleteItem[]>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimeoutRef = useRef<number | NodeJS.Timeout | null>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

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


  const submitKeyword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const kw = keywordInput.trim()

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current as number)
      debounceTimeoutRef.current = null
    }
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      kw ? next.set('keyword', kw) : next.delete('keyword')
      next.set('page', '0')
      return next
    }, { replace: true })
    setIsOpen(false)
    setIsAutocompleteLoading(false)
    setIsFocused(false)
    mobileSearchInputRef.current?.blur()
    scrollToPageTop(e.currentTarget)
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
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
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
  const langPrefix = isEn ? '/en' : '/ko'
  const seoCanonical = category
    ? buildCanonical(`${langPrefix}/spirits?category=${category}`)
    : buildCanonical(`${langPrefix}/spirits`)
  const hasNonCanonicalQuery = Array.from(searchParams.keys()).some((key) => key !== 'category')
  const hasNonCanonicalCategory = categoryValues.length > 0
    && (categoryValues.length !== 1 || !category || categoryParam !== category)
  const seoNoindex = hasNonCanonicalQuery || hasNonCanonicalCategory || Boolean(data?.empty)
  // A canonical category's empty/non-empty state is decided by SSR first. Preserve that
  // robots/JSON-LD state until React Query has the same result instead of briefly flipping it.
  const deferIndexState = Boolean(category) && data == null
    && !hasNonCanonicalQuery && !hasNonCanonicalCategory

  // JSON-LD: Breadcrumb + ItemList (+ CollectionPage 카테고리 페이지)
  const seoBreadcrumb = buildBreadcrumbSchema(
    category
      ? [
          { name: isEn ? 'Home' : '홈', path: langPrefix },
          { name: isEn ? 'Spirits' : '주류 카탈로그', path: `${langPrefix}/spirits` },
          { name: isEn ? meta.titleEn : meta.titleKo,
            path: `${langPrefix}/spirits?category=${category}` },
        ]
      : [
          { name: isEn ? 'Home' : '홈', path: langPrefix },
          { name: isEn ? 'Spirits' : '주류 카탈로그', path: `${langPrefix}/spirits` },
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
        deferIndexState={deferIndexState}
        keywords={isEn ? meta.keywordsEn : meta.keywordsKo}
        jsonLd={seoJsonLd}
      />

      <div className="flex items-start gap-6">
        {/* PC 좌측 필터 패널 — 목록 스크롤과 독립적으로 헤더·GNB 아래에 고정.
            내용이 뷰포트보다 길 때만 패널 내부에서 스크롤하고, row 하단에서 자연스럽게 멈춘다. */}
        <aside
          className="hidden lg:block sticky w-72 flex-shrink-0 bg-white rounded-2xl border border-neutral-200 p-4
            overflow-y-auto overscroll-contain"
          style={{
            top: chromeTop,
            maxHeight: `calc(100dvh - ${chromeTop + 24}px)`,
          }}
        >
          <FilterPanel {...filterProps} />
        </aside>

        {/* 메인 영역 */}
        <div className="flex-1 min-w-0">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            {t(`spirit.listTitle.${category?.toLowerCase() || 'all'}`)}
          </h1>
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
              <div
                className="flex rounded-sm border border-neutral-300 bg-white p-0.5"
                role="group"
                aria-label={t('spirit.viewMode.label')}
              >
                <button
                  type="button"
                  onClick={() => handleViewModeChange('grid')}
                  aria-label={t('spirit.viewMode.grid')}
                  aria-pressed={viewMode === 'grid'}
                  title={t('spirit.viewMode.grid')}
                  className={`rounded-sm p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-primary-400 ${
                    viewMode === 'grid'
                      ? 'bg-primary-800 text-white shadow-sm'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('list')}
                  aria-label={t('spirit.viewMode.list')}
                  aria-pressed={viewMode === 'list'}
                  title={t('spirit.viewMode.list')}
                  className={`rounded-sm p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-primary-400 ${
                    viewMode === 'list'
                      ? 'bg-primary-800 text-white shadow-sm'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="9" y1="6" x2="21" y2="6" />
                    <line x1="9" y1="12" x2="21" y2="12" />
                    <line x1="9" y1="18" x2="21" y2="18" />
                    <rect x="3" y="4" width="2" height="2" rx="0.5" />
                    <rect x="3" y="10" width="2" height="2" rx="0.5" />
                    <rect x="3" y="16" width="2" height="2" rx="0.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* 목록 */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" className="text-primary-800" />
            </div>
          ) : isError ? (
            // 실패를 "검색 결과 없음"으로 그리면 필터를 의심하게 된다 — 실패는 실패로 말한다.
            <ListErrorState onRetry={() => { void refetch() }} />
          ) : !data || data.empty ? (
            <EmptyState
              title={t('spirit.noResult.title')}
              description={t('spirit.noResult.description')}
              action={{ label: t('spirit.noResult.reset'), onClick: handleReset }}
            />
          ) : (
            <div
              className={`${viewMode === 'grid'
                ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 lg:gap-4'
                : 'flex flex-col gap-3'}
                transition-opacity ${isFetching ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {data.content.map((spirit) => (
                <SpiritCard
                  key={spirit.id}
                  spirit={spirit}
                  detailState={detailState}
                  imageFit="contain"
                  listView={viewMode === 'list'}
                  showSecondaryName={false}
                  uniformTwoLineName
                />
              ))}
            </div>
          )}

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={(p) => setParam({ page: p })}
              scrollTarget="page"
              className="mt-8 mb-[calc(5rem+env(safe-area-inset-bottom))] lg:mb-0"
            />
          )}
        </div>
      </div>

      {/* 모바일 필터 드로어 */}
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <FilterPanel {...filterProps} />
      </FilterDrawer>

      {/* 모바일 하단 고정 검색창 (MO only, 스크롤 유지, 포커스 시 크기 변동)
          키보드가 올라오면 그 높이만큼 함께 올라간다 — 고정 요소는 레이아웃 뷰포트에
          붙어 있어, 보정하지 않으면 방금 탭한 검색창이 키보드 뒤로 숨는다.
          키보드가 떠 있는 동안에는 하단 탭바(4.5rem)가 가릴 일이 없으므로 그 몫은 뺀다. */}
      <div
        className="lg:hidden fixed left-4 right-4 z-30 max-w-md mx-auto transition-[bottom] duration-150"
        style={{
          bottom: keyboardInset > 0
            ? `calc(${keyboardInset}px + 0.75rem)`
            : 'calc(4.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <form
          onSubmit={submitKeyword}
          className={`relative transition-all duration-300 ease-out bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/80
            ${isFocused ? 'ring-2 ring-primary-400/30 border-primary-500 shadow-xl -translate-y-0.5' : ''}`}
        >
          {/* 모바일 자동완성 글래스모피즘 드롭다운 (위로 솟아오름) */}
          {isOpen && (results.length > 0 || isAutocompleteLoading) && (
            <div
              // 키보드가 올라오면 검색창 위로 남는 자리가 화면의 절반도 안 된다.
              // max-h 를 고정해 두면 목록이 화면 위로 삐져나가 첫 항목부터 잘린다.
              className="absolute bottom-full left-0 right-0 mb-2.5 z-50 bg-white/90 backdrop-blur-md border border-neutral-200/80 rounded-2xl shadow-xl overflow-hidden overflow-y-auto overscroll-contain"
              style={{ maxHeight: `min(15rem, calc(100dvh - ${keyboardInset}px - 10rem))` }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {isAutocompleteLoading && results.length === 0 ? (
                <div className="p-3 text-center text-xs text-neutral-500">
                  {t('spirit.search.loading', '검색 중...')}
                </div>
              ) : results.length > 0 ? (
                <ul className="py-1">
                  {results.map((item) => {
                    const displayName = getLocalizedSpiritListNames(item, i18n.language)
                    return (
                      <li key={item.id}>
                        <button
                          type="button"

                          onClick={() => {
                            navigate(getSpiritDetailPath(item, i18n.language))
                            setKeywordInput(displayName.primaryName)
                            setIsOpen(false)
                          }}
                          className="w-full text-left px-3.5 py-2 flex items-center gap-3 hover:bg-neutral-50/50 transition-colors"
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={displayName.primaryName}
                              className="w-8 h-8 object-contain rounded bg-white flex-shrink-0 border border-neutral-100"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-neutral-100/50 flex items-center justify-center text-neutral-400 flex-shrink-0 text-[8px]">
                              No Image
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-neutral-800 truncate">
                              {displayName.primaryName}
                            </div>
                            {displayName.secondaryName && <div className="text-[10px] text-neutral-400 truncate">
                              {displayName.secondaryName}
                            </div>}
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
            ref={mobileSearchInputRef}
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
            // 글자 크기는 포커스 여부와 무관하게 16px 로 둔다 — 그보다 작으면 iOS Safari 가
            // 탭할 때마다 페이지를 확대하고, 포커스를 잃어도 스스로 풀리지 않는다.
            // 접힌 모습은 높이(h-11 ↔ h-12)로만 만든다. 접혀 있어도 44px 는 지킨다.
            className={`w-full pl-5 pr-12 text-base transition-all duration-300 ease-out rounded-full bg-transparent text-neutral-800 focus:outline-none
              ${isFocused ? 'h-12' : 'h-11'}`}
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
