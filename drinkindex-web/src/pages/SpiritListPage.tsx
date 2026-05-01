import { useState, useEffect, useCallback, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritCategory, SpiritSort } from '@/domain/spirit/types/spirit.types'
import SpiritCard from '@/shared/components/SpiritCard'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import EmptyState from '@/shared/components/EmptyState'
import RangeSlider from '@/shared/components/RangeSlider'

// ── Constants ──────────────────────────────────────────────
const CATEGORIES: SpiritCategory[] = [
  'WHISKY', 'COGNAC', 'WINE', 'TEQUILA', 'RUM', 'GIN', 'VODKA', 'OTHER',
]
const CATEGORY_LABELS: Record<string, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', TEQUILA: '데낄라',
  RUM: '럼', GIN: '진', VODKA: '보드카', OTHER: '기타',
}
const SORT_OPTIONS: { value: SpiritSort; label: string }[] = [
  { value: 'LATEST',            label: '최신순' },
  { value: 'SCORE_DESC',        label: '평점 높은순' },
  { value: 'REVIEW_COUNT_DESC', label: '리뷰 많은순' },
]
const COUNTRIES = [
  'Scotland', 'Japan', 'United States', 'Ireland', 'France', 'Mexico',
  'Jamaica', 'Russia', 'Netherlands', 'Sweden', 'Australia', 'Taiwan', 'India',
]

// ── Filter Panel ───────────────────────────────────────────
interface FilterPanelProps {
  category: string
  country: string
  abvRange: [number, number]
  scoreRange: [number, number]
  onCategory: (v: string) => void
  onCountry:  (v: string) => void
  onAbv:      (v: [number, number]) => void
  onAbvEnd:   (v: [number, number]) => void
  onScore:    (v: [number, number]) => void
  onScoreEnd: (v: [number, number]) => void
  onReset:    () => void
}

function FilterPanel(p: FilterPanelProps) {
  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          카테고리
        </h3>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-neutral-300 text-primary-600
                  focus:ring-primary-400 focus:ring-offset-0"
                checked={p.category === cat}
                onChange={() => p.onCategory(p.category === cat ? '' : cat)}
              />
              <span className="text-sm text-neutral-700 group-hover:text-neutral-900">
                {CATEGORY_LABELS[cat]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Country */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          국가
        </h3>
        <select
          value={p.country}
          onChange={(e) => p.onCountry(e.target.value)}
          className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2
            focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white text-neutral-700"
        >
          <option value="">전체</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* ABV */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
          도수 (%)
        </h3>
        <RangeSlider
          min={0} max={70}
          value={p.abvRange}
          onChange={p.onAbv}
          onChangeEnd={p.onAbvEnd}
          step={1}
          formatLabel={(v) => `${v}%`}
        />
      </div>

      {/* Score */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
          평균 점수
        </h3>
        <RangeSlider
          min={0} max={100}
          value={p.scoreRange}
          onChange={p.onScore}
          onChangeEnd={p.onScoreEnd}
          step={1}
        />
      </div>

      {/* Reset */}
      <button
        onClick={p.onReset}
        className="w-full text-sm text-neutral-400 hover:text-danger-600 transition-colors text-center"
      >
        필터 초기화
      </button>
    </div>
  )
}

// ── Mobile Drawer ──────────────────────────────────────────
interface DrawerProps { open: boolean; onClose: () => void; children: React.ReactNode }

function FilterDrawer({ open, onClose, children }: DrawerProps) {
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
            <DialogPanel className="relative w-72 max-w-[85vw] bg-white h-full overflow-y-auto shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <DialogTitle className="font-semibold text-neutral-900">필터</DialogTitle>
                <button onClick={onClose} aria-label="닫기"
                  className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="p-5 flex-1">{children}</div>
              <div className="p-4 border-t border-neutral-100">
                <button onClick={onClose}
                  className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">
                  적용하기
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ── Main Page ──────────────────────────────────────────────
export default function SpiritListPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Read from URL
  const category  = searchParams.get('category') ?? ''
  const country   = searchParams.get('country')  ?? ''
  const sort      = (searchParams.get('sort') as SpiritSort) ?? 'LATEST'
  const page      = parseInt(searchParams.get('page')     ?? '0')
  const urlMinAbv = parseFloat(searchParams.get('minAbv') ?? '0')
  const urlMaxAbv = parseFloat(searchParams.get('maxAbv') ?? '70')
  const urlMinScore = parseFloat(searchParams.get('minScore') ?? '0')
  const urlMaxScore = parseFloat(searchParams.get('maxScore') ?? '100')

  // Keyword with debounce
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

  // Slider local state (updates URL only on pointer-up)
  const [abvRange,   setAbvRange]   = useState<[number, number]>([urlMinAbv, urlMaxAbv])
  const [scoreRange, setScoreRange] = useState<[number, number]>([urlMinScore, urlMaxScore])

  // Sync sliders when URL changes (back/forward navigation)
  useEffect(() => {
    setAbvRange([urlMinAbv, urlMaxAbv])
  }, [urlMinAbv, urlMaxAbv]) // eslint-disable-line

  useEffect(() => {
    setScoreRange([urlMinScore, urlMaxScore])
  }, [urlMinScore, urlMaxScore]) // eslint-disable-line

  // URL update helpers
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
    setParam({ minAbv: lo > 0 ? lo : null, maxAbv: hi < 70 ? hi : null })
  }
  const commitScore = ([lo, hi]: [number, number]) => {
    setParam({ minScore: lo > 0 ? lo : null, maxScore: hi < 100 ? hi : null })
  }
  const handleReset = () => {
    setAbvRange([0, 70])
    setScoreRange([0, 100])
    setKeywordInput('')
    setSearchParams({}, { replace: true })
  }

  // Query
  const keyword = searchParams.get('keyword') ?? ''
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['spirits', { keyword, category, country, sort, page,
      minAbv: urlMinAbv, maxAbv: urlMaxAbv, minScore: urlMinScore, maxScore: urlMaxScore }],
    queryFn: () =>
      spiritApi.search({
        keyword:   keyword   || undefined,
        category:  (category as SpiritCategory) || undefined,
        country:   country   || undefined,
        sort,
        page,
        size: 20,
        minAbv:    urlMinAbv   > 0   ? urlMinAbv   : undefined,
        maxAbv:    urlMaxAbv   < 70  ? urlMaxAbv   : undefined,
        minScore:  urlMinScore > 0   ? urlMinScore : undefined,
        maxScore:  urlMaxScore < 100 ? urlMaxScore : undefined,
      }).then((r) => r.data.data!),
    staleTime: 30_000,
  })

  const filterProps: FilterPanelProps = {
    category, country, abvRange, scoreRange,
    onCategory: (v) => setParam({ category: v }),
    onCountry:  (v) => setParam({ country: v }),
    onAbv:      setAbvRange,
    onAbvEnd:   commitAbv,
    onScore:    setScoreRange,
    onScoreEnd: commitScore,
    onReset:    handleReset,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Search row */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        {/* Mobile filter button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 border border-neutral-200
            rounded-xl text-sm text-neutral-600 hover:bg-neutral-50 transition-colors bg-white"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/>
            <line x1="12" y1="18" x2="20" y2="18"/>
          </svg>
          필터
        </button>
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-20 bg-white rounded-2xl border border-neutral-100 p-5">
            <FilterPanel {...filterProps} />
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 min-w-0">
          {/* Sort + count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-neutral-500">
              {data ? `총 ${data.totalElements.toLocaleString()}개` : ''}
            </p>
            <select
              value={sort}
              onChange={(e) => setParam({ sort: e.target.value })}
              className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white
                focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-700"
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" className="text-primary-600" />
            </div>
          ) : !data || data.empty ? (
            <EmptyState
              title="검색 결과가 없습니다."
              description="다른 키워드나 필터로 다시 시도해보세요."
              action={{ label: '필터 초기화', onClick: handleReset }}
            />
          ) : (
            <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
              ${isFetching ? 'opacity-70 pointer-events-none' : ''} transition-opacity`}>
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

      {/* Mobile filter drawer */}
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <FilterPanel {...filterProps} />
      </FilterDrawer>
    </div>
  )
}
