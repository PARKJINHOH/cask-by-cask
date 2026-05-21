import { useState, useEffect, useCallback, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

const SORT_VALUES: SpiritSort[] = ['LATEST', 'SCORE_DESC', 'REVIEW_COUNT_DESC']

// ── 필터 패널 ─────────────────────────────────────────────────
interface FilterPanelProps {
  category:     SpiritCategory | ''
  whiskyStyle:  WhiskyStyle | ''
  wineType:     WineType | ''
  cognacGrade:  CognacGrade | ''
  country:      string
  region:       string
  abvRange:     [number, number]
  scoreRange:   [number, number]
  onCategory:   (v: SpiritCategory | '') => void
  onWhiskyStyle: (v: WhiskyStyle | '') => void
  onWineType:   (v: WineType | '') => void
  onCognacGrade: (v: CognacGrade | '') => void
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
    <div className="space-y-6">
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
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
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
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
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
      <button
        onClick={p.onReset}
        className="w-full text-sm text-neutral-400 hover:text-danger-600 transition-colors text-center"
      >
        {t('spirit.filter.reset')}
      </button>
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
                  className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium
                    rounded-lg hover:bg-primary-700 transition-colors"
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
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // URL에서 필터 값 읽기
  const category    = (searchParams.get('category') as SpiritCategory) ?? ''
  const whiskyStyle = (searchParams.get('whiskyStyle') as WhiskyStyle) ?? ''
  const wineType    = (searchParams.get('wineType') as WineType) ?? ''
  const cognacGrade = (searchParams.get('cognacGrade') as CognacGrade) ?? ''
  const country     = searchParams.get('country') ?? ''
  const region      = searchParams.get('region')  ?? ''
  const sort        = (searchParams.get('sort') as SpiritSort) ?? 'LATEST'
  const page        = parseInt(searchParams.get('page')     ?? '0')
  const urlMinAbv   = parseFloat(searchParams.get('minAbv') ?? '0')
  const urlMaxAbv   = parseFloat(searchParams.get('maxAbv') ?? '100')
  const urlMinScore = parseFloat(searchParams.get('minScore') ?? '0')
  const urlMaxScore = parseFloat(searchParams.get('maxScore') ?? '100')

  // 키워드 (debounce)
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') ?? '')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        keywordInput ? next.set('keyword', keywordInput) : next.delete('keyword')
        next.set('page', '0')
        return next
      }, { replace: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [keywordInput]) // eslint-disable-line

  // 슬라이더 로컬 상태 (포인터업 시에만 URL 업데이트)
  const [abvRange,   setAbvRange]   = useState<[number, number]>([urlMinAbv, urlMaxAbv])
  const [scoreRange, setScoreRange] = useState<[number, number]>([urlMinScore, urlMaxScore])

  useEffect(() => { setAbvRange([urlMinAbv, urlMaxAbv]) }, [urlMinAbv, urlMaxAbv]) // eslint-disable-line
  useEffect(() => { setScoreRange([urlMinScore, urlMaxScore]) }, [urlMinScore, urlMaxScore]) // eslint-disable-line

  const setParam = useCallback((updates: Record<string, string | number | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === '' || v === 0) next.delete(k)
        else next.set(k, String(v))
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
      whiskyStyle: null, wineType: null, cognacGrade: null,
      region: null,
    })
  }

  // 국가 변경 시 region 클리어
  const handleCountryChange = (v: string) => {
    setParam({ country: v, region: null })
  }

  // ActiveFilterChips용 클리어 핸들러
  const handleClearKey = (key: keyof ActiveFilterState | 'abv' | 'score') => {
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
        whiskyStyle: (whiskyStyle as WhiskyStyle) || undefined,
        wineType:    (wineType as WineType) || undefined,
        cognacGrade: (cognacGrade as CognacGrade) || undefined,
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 검색 + 모바일 필터 버튼 (모바일 전용 — PC는 헤더 검색 사용) */}
      <div className="flex gap-2 mb-5 lg:hidden">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder={t('spirit.search.placeholder')}
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
          />
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-neutral-200
            rounded-xl text-sm text-neutral-600 hover:bg-neutral-50 transition-colors bg-white"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/>
            <line x1="12" y1="18" x2="20" y2="18"/>
          </svg>
          {t('spirit.filter.title')}
        </button>
      </div>

      <div className="flex gap-6">
        {/* PC 좌측 고정 필터 패널 */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-20 bg-white rounded-2xl border border-neutral-100 p-5
            max-h-[calc(100vh-6rem)] overflow-y-auto">
            <FilterPanel {...filterProps} />
          </div>
        </aside>

        {/* 메인 영역 */}
        <div className="flex-1 min-w-0">
          {/* 적용된 필터 칩 */}
          <ActiveFilterChips
            state={activeState}
            onClear={handleClearKey}
            onClearAll={handleReset}
          />

          {/* 정렬 + 건수 */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-neutral-500">
              {data
                ? t('spirit.count', { count: data.totalElements })
                : ''}
            </p>
            <select
              value={sort}
              onChange={(e) => setParam({ sort: e.target.value })}
              className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white
                focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-700"
            >
              {SORT_VALUES.map((v) => (
                <option key={v} value={v}>
                  {t(`spirit.sort.${v}`)}
                </option>
              ))}
            </select>
          </div>

          {/* 목록 */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" className="text-primary-600" />
            </div>
          ) : !data || data.empty ? (
            <EmptyState
              title={t('spirit.noResult.title')}
              description={t('spirit.noResult.description')}
              action={{ label: t('spirit.noResult.reset'), onClick: handleReset }}
            />
          ) : (
            <div
              className={`flex flex-col gap-2
                transition-opacity ${isFetching ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {data.content.map((spirit) => (
                <SpiritCard key={spirit.id} spirit={spirit} listView />
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

      {/* 모바일 필터 드로어 */}
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <FilterPanel {...filterProps} />
      </FilterDrawer>

    </div>
  )
}
